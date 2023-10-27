module.exports = {
  git: {
    changelog: 'echo "## Changelog\\n\\n$(npx @uphold/github-changelog-generator -f unreleased | tail -n +4 -f)"',
    commitMessage: 'Release ${name}@${version}',
    requireCommits: true,
    tagName: '${name}@v${version}'
  },
  github: {
    release: true,
    releaseName: '${name}@v${version}'
  },
  hooks: {
    'after:bump': `
      npm run build &&
      echo "$(npx @uphold/github-changelog-generator -f \${version} -t v\${version})\n$(tail -n +2 CHANGELOG.md)" > CHANGELOG.md &&
      git add dist CHANGELOG.md --all
    `
  }
};
