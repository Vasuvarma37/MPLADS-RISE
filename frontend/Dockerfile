# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage — nginx
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html

# Default backend URL — override via BACKEND_URL env var in Render dashboard
ENV BACKEND_URL=https://mplads-rise.onrender.com

# Copy nginx config as a template (contains ${BACKEND_URL} placeholder)
COPY nginx.conf /etc/nginx/nginx.conf.template

# Entrypoint: substitute ONLY ${BACKEND_URL} then start nginx
# We explicitly pass the variable list to envsubst so it doesn't
# accidentally replace nginx's own variables like $host, $uri, etc.
CMD ["/bin/sh", "-c", \
  "envsubst '${BACKEND_URL}' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]

EXPOSE 80
