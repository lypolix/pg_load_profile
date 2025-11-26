FROM golang:1.25-alpine AS builder
    
WORKDIR /app
    
COPY go.mod ./
COPY go.sum ./
RUN go mod download
    
COPY . .
    
RUN CGO_ENABLED=0 GOOS=linux go build -o /profiler-app ./main.go
    
FROM alpine:latest
    
WORKDIR /root/
    
COPY --from=builder /profiler-app .
    
CMD ["./profiler-app"]
    