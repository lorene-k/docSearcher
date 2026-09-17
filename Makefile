CERT_DIR :=	certs
CERT :=		$(CERT_DIR)/localhost.pem
KEY :=		$(CERT_DIR)/localhost-key.pem

all:		dev

install:	install-backend install-frontend

install-backend:
			cd backend && python3.14 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt

install-frontend:
			cd frontend && npm install

certs:		$(CERT)

$(CERT):
			@command -v mkcert >/dev/null || { echo "mkcert is missing: brew install mkcert"; exit 1; }
			mkcert -install
			mkdir -p $(CERT_DIR)
			mkcert -cert-file $(CERT) -key-file $(KEY) localhost 127.0.0.1 ::1

dev:		certs
			@trap 'kill 0' EXIT; \
			(cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000 \
				--ssl-keyfile ../$(KEY) --ssl-certfile ../$(CERT)) & \
			(cd frontend && npm run dev) & \
			wait

backend:	certs
			cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000 \
				--ssl-keyfile ../$(KEY) --ssl-certfile ../$(CERT)

frontend:	certs
			cd frontend && npm run dev

test: 		test-backend test-frontend

test-backend:
			cd backend && .venv/bin/pytest tests/ -v

test-frontend:
			cd frontend && npm test

lint:		lint-backend lint-frontend

lint-backend:
			cd backend && .venv/bin/ruff check .

lint-frontend:
			cd frontend && npm run lint

format:		format-backend format-frontend

format-backend:
			cd backend && .venv/bin/ruff format . && .venv/bin/ruff check --fix .

format-frontend:
			cd frontend && npm run format

coverage:	coverage-backend coverage-frontend

coverage-backend:
			cd backend && .venv/bin/pytest tests/ --cov=app --cov-report=term-missing

coverage-frontend:
			cd frontend && npm test -- --coverage


.PHONY: all install install-backend install-frontend certs dev backend frontend test test-backend test-frontend \
		lint lint-backend lint-frontend format format-backend format-frontend coverage coverage-backend coverage-frontend