
# Docker Commands Cheat Sheet — Express Blog API

## 1. Start the project

Run from the folder containing `compose.yaml` or `docker-compose.yml`.

```bash
docker compose up -d --build
```

## 2. Check containers

```bash
docker compose ps
docker ps
docker ps -a
```

## 3. View logs

```bash
docker compose logs -f
docker compose logs -f express-app
```

Press `Ctrl+C` to stop following logs.

## 4. Stop and restart

```bash
docker compose stop
docker compose start
```

## 5. Rebuild after code changes

```bash
docker compose up -d --build
```

## 6. Stop and remove containers

```bash
docker compose down
```

Named volumes are normally preserved.

**Avoid `docker compose down -v`** unless you intend to delete the associated named volumes.

## 7. Plain Docker commands (when not using Compose)

Build the image:

```bash
docker build -t blog-api .
```

List all containers:

```bash
docker ps -a
```

Start an existing stopped container:

```bash
docker start blog-api-container
```

View logs:

```bash
docker logs -f blog-api-container
```

Stop a container:

```bash
docker stop blog-api-container
```

Remove a stopped container:

```bash
docker rm blog-api-container
```

## 8. Test the API

```bash
curl http://localhost:5000/
```

Use the host port configured in your Docker setup. Your previous Compose setup mapped port `5001` on your computer to port `5000` inside the backend container.

## Remember

- `build` = create an image.
- `up` = create/start services.
- `start` = start existing stopped containers.
- `logs` = inspect application output.
- `stop` = stop containers without removing them.
- `down` = remove Compose containers and networks.
- Never delete database volumes unless you intend to remove persisted data.

docker start -a express-app
