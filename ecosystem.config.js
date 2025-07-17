module.exports = {
  apps: [
    {
      name: 'frontend',
      cwd: '/home/YOUR_USERNAME/Unchained-Social-Public/frontend',
      script: 'npm',
      args: 'run dev',
    },
    {
      name: 'ipfs',
      script: 'ipfs',
      args: 'daemon'
    },
    {
      name: 'mediawatcher',
      interpreter: 'node',
      interpreter_args: '--experimental-json-modules',
      script: '/home/YOUR_USERNAME/Unchained-Social-Public/media-watcher/post_watcher.mjs'
    },
    {
      name: 'tailscale-funnel',
      script: 'tailscale',
      args: 'funnel 3000'
    }
  ]
};