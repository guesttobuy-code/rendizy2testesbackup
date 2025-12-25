export default async () => {
  const [tailwindMod, autoprefixerMod] = await Promise.all([
    import('@tailwindcss/postcss'),
    import('autoprefixer'),
  ])

  const tailwindcss = tailwindMod?.default ?? tailwindMod
  const autoprefixer = autoprefixerMod?.default ?? autoprefixerMod

  return {
    plugins: [tailwindcss(), autoprefixer()],
  }
}
