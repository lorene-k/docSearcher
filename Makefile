all:		dev

install:	install-backend install-frontend

install-backend:
			cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt

install-frontend:
			cd frontend && npm install

dev:
			@trap 'kill 0' EXIT; \
			(cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000) & \
			(cd frontend && npm run dev) & \
			wait

backend:
			cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000

frontend:
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


.PHONY: all install install-backend install-frontend dev backend frontend test test-backend test-frontend \
		lint lint-backend lint-frontend format format-backend format-frontend coverage coverage-backend coverage-frontend