// Installs the Git hooks for contributors. Skipped on CI and hosting (Vercel), where there
// is no working copy to hook into and dev tools may not be installed yet.
if (process.env.CI || process.env.VERCEL || process.env.NODE_ENV === 'production') process.exit(0)
const { default: husky } = await import('husky')
const message = husky()
if (message) console.log(message)
