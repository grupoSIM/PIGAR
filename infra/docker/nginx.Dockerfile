FROM nginx:1.28-alpine

COPY infra/nginx/nginx.conf /etc/nginx/nginx.conf
