#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use git2::{Oid, Repository, Sort};
use serde::Serialize;
use std::path::Path;

#[derive(Serialize)]
struct Commit {
    hash: String,
    author: String,
    time: String,
    message: String,
}

#[derive(Serialize)]
struct Branch {
    name: String,
    is_head: bool,
}

#[derive(Serialize)]
struct CommitDetail {
    hash: String,
    author: String,
    time: String,
    message: String,
    files: Vec<FileChange>,
}

#[derive(Serialize)]
struct FileChange {
    path: String,
    status: String,
    additions: usize,
    deletions: usize,
    diff: String,
}

#[tauri::command]
fn get_commits(path: String) -> Result<Vec<Commit>, String> {
    let expanded = shellexpand::tilde(&path).to_string();
    let repo = Repository::open(Path::new(&expanded)).map_err(|e| format!("无法打开仓库: {}", e))?;
    let mut commits = Vec::new();

    let mut revwalk = repo.revwalk().map_err(|e| format!("无法创建 revwalk: {}", e))?;
    revwalk.push_head().map_err(|e| format!("无法推送 HEAD: {}", e))?;
    revwalk.set_sorting(Sort::TIME).map_err(|e| format!("无法设置排序: {}", e))?;

    for oid in revwalk {
        let oid = oid.map_err(|e| format!("遍历失败: {}", e))?;
        let commit = repo.find_commit(oid).map_err(|e| format!("找不到提交: {}", e))?;

        let time = commit.time();
        let timestamp = chrono::DateTime::from_timestamp(time.seconds(), 0)
            .map(|dt| dt.format("%Y-%m-%d %H:%M:%S").to_string())
            .unwrap_or_else(|| "未知时间".into());

        commits.push(Commit {
            hash: oid.to_string(),
            author: commit.author().name().unwrap_or("未知").to_string(),
            time: timestamp,
            message: commit.message().unwrap_or("").to_string(),
        });

        if commits.len() >= 100 {
            break;
        }
    }

    Ok(commits)
}

#[tauri::command]
fn get_branches(path: String) -> Result<Vec<Branch>, String> {
    let expanded = shellexpand::tilde(&path).to_string();
    let repo = Repository::open(Path::new(&expanded))
        .map_err(|e| format!("无法打开仓库: {}", e))?;

    let branches = repo
        .branches(None)
        .map_err(|e| format!("无法获取分支: {}", e))?;

    let head_name = repo
        .head()
        .ok()
        .and_then(|h| h.shorthand().ok().map(|s| s.to_string()));

    let mut result = Vec::new();
    for branch in branches {
        let (branch, _) = branch.map_err(|e| format!("分支错误: {}", e))?;
        let opt_name = branch.name().map_err(|e| format!("分支名错误: {}", e))?;
        let name = opt_name.unwrap_or("未知").to_string();
        let is_head = head_name.as_deref() == Some(&name);
        result.push(Branch { name, is_head });
    }

    result.sort_by(|a, b| b.is_head.cmp(&a.is_head));

    Ok(result)
}

#[tauri::command]
fn get_commit_detail(path: String, commit_hash: String) -> Result<CommitDetail, String> {
    let expanded = shellexpand::tilde(&path).to_string();
    let repo = Repository::open(Path::new(&expanded))
        .map_err(|e| format!("无法打开仓库: {}", e))?;

    let oid = Oid::from_str(&commit_hash).map_err(|e| format!("无效的哈希: {}", e))?;
    let commit = repo.find_commit(oid).map_err(|e| format!("找不到提交: {}", e))?;
    let tree = commit.tree().map_err(|e| format!("无法获取树: {}", e))?;

    let parent_tree = commit.parents().next().and_then(|p| p.tree().ok());

    let diff = repo
        .diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), None)
        .map_err(|e| format!("无法生成 Diff: {}", e))?;

    let mut files = Vec::new();
    let deltas: Vec<git2::DiffDelta<'_>> = diff.deltas().collect();

    for (idx, delta) in deltas.iter().enumerate() {
        let status = match delta.status() {
            git2::Delta::Added => "A",
            git2::Delta::Deleted => "D",
            git2::Delta::Modified => "M",
            git2::Delta::Renamed => "R",
            _ => "?",
        };

        let path = delta
            .new_file()
            .path()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| "未知文件".into());

        let patch = git2::Patch::from_diff(&diff, idx)
            .map_err(|e| format!("Patch 创建失败: {}", e))?;

        let (additions, deletions, diff_text) = if let Some(mut p) = patch {
            let mut add = 0;
            let mut del = 0;
            let mut diff_content = Vec::new();

            p.print(&mut |_delta, _hunk, line| {
                match line.origin() {
                    '+' => add += 1,
                    '-' => del += 1,
                    _ => {}
                }
                diff_content.extend_from_slice(line.content());
                true
            })
            .map_err(|e| format!("Diff 打印失败: {}", e))?;

            let diff_str = String::from_utf8_lossy(&diff_content).to_string();
            (add, del, diff_str)
        } else {
            (0, 0, String::new())
        };

        files.push(FileChange {
            path,
            status: status.to_string(),
            additions,
            deletions,
            diff: diff_text,
        });
    }

    // 提前提取作者和消息，避免生命周期问题
    let author_name = commit.author().name().unwrap_or("未知").to_string();
    let message = commit.message().unwrap_or("").to_string();

    let time = commit.time();
    let timestamp = chrono::DateTime::from_timestamp(time.seconds(), 0)
        .map(|dt| dt.format("%Y-%m-%d %H:%M:%S").to_string())
        .unwrap_or_else(|| "未知时间".into());

    Ok(CommitDetail {
        hash: commit_hash,
        author: author_name,
        time: timestamp,
        message,
        files,
    })
}

#[tauri::command]
fn search_commits(path: String, query: String) -> Result<Vec<Commit>, String> {
    let all = get_commits(path)?;
    let query_lower = query.to_lowercase();
    let filtered: Vec<Commit> = all
        .into_iter()
        .filter(|c| {
            c.message.to_lowercase().contains(&query_lower)
                || c.author.to_lowercase().contains(&query_lower)
        })
        .take(50)
        .collect();
    Ok(filtered)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_commits,
            get_branches,
            get_commit_detail,
            search_commits
        ])
        .run(tauri::generate_context!())
        .expect("启动失败");
}