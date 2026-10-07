# Build the static site with Bun, then serve it with nginx on port 3000.
FROM oven/bun:1-alpine AS build
WORKDIR /src
COPY SPEC.md ./
COPY skills ./skills
COPY cli ./cli
COPY .concepts ./.concepts
COPY site ./site
RUN bun site/build.ts

FROM nginx:alpine
COPY site/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/site/dist /usr/share/nginx/html
EXPOSE 3000
