FROM golang:1.25-alpine AS builder
    
WORKDIR /app
    
COPY go.mod ./
COPY go.sum ./
RUN go mod download
    
COPY . .
    
RUN CGO_ENABLED=0 GOOS=linux go build -o /profiler-app ./cmd/server/main.go
    
FROM alpine:latest
    
WORKDIR /root/

RUN apk add --no-cache postgresql-client
    
COPY --from=builder /profiler-app .

COPY scenarios ./scenarios
    
CMD ["./profiler-app"]