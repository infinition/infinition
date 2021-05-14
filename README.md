
<a href="https://github.com/infinition">
  <img align="center" src="https://github-readme-stats.vercel.app/api?username=Infinition&count_private=true&show_icons=true&theme=chartreuse-dark" />
</a>
<a href="https://github.com/infinition">
  <img align="center" src="https://github-readme-stats.vercel.app/api/top-langs/?username=Infinition&layout=compact&theme=chartreuse-dark&langs_count=8" />
</a>
{
  user(login: "infinition") {
    repositories(isFork: false, first: 100, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes {
        name
        updatedAt
        languages(first: 5, orderBy: {field: SIZE, direction: DESC}) {
          nodes {
            name
          }
        }
        primaryLanguage {
          name
        }
      }
    }
  }
}
