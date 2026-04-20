# git-archive

Archives git and SVN repositories as [git bundle](https://git-scm.com/docs/git-bundle) files. Each repo is cloned, bundled, and saved to an output directory.

## Requirements

- [Node.js](https://nodejs.org)
- `git` (for git repos)
- `git svn` (for SVN repos — included with most git distributions)

## Setup

1. Clone this repo and `cd` into it.
2. List your git repo URLs in `repos-git.txt`, one per line.
3. List your SVN repo URLs in `repos-svn.txt`, one per line.

## Repo list files

Each file is a plain text file with one URL per line. Blank lines are ignored.

**`repos-git.txt`**

```text
https://github.com/example/repo-one.git
https://github.com/example/repo-two.git
```

**`repos-svn.txt`**

```text
https://svn.example.com/project-one/
https://svn.example.com/project-two/
```

## Usage

Run with the defaults (`repos-git.txt` and `repos-svn.txt` in the current directory):

```sh
node index.js
```

Or pass custom file paths as arguments:

```sh
node index.js path/to/git-repos.txt path/to/svn-repos.txt
```

Bundles are written to `./bundles/`. Each bundle is named after the repo (e.g. `repo-name.bundle`).

## Output

```text
bundles/
  repo-one.bundle
  repo-two.bundle
  ...
```

Bundles can be restored with:

```sh
git clone repo-name.bundle
```
