module.exports = {
  git: {
    changelog: 'git log --pretty=format:"* %s (%h)" ${from}...${to} .',
    commitMessage: 'Release ${npm.name}@${version}',
    requireBranch: 'master',
    requireCommits: true,
    tagName: '${npm.name}@v${version}'
  },
  github: {
    release: true,
    releaseName: '${npm.name}@v${version}'
  },
  hooks: {
    'after:bump': `
      npm run build &&
      git add dist --all
    `
  }
};
