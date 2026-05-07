#!/bin/bash
set -euo pipefail

cd /root/core-ps

git pull --ff-only
docker compose up -d --build

