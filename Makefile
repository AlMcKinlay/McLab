#!make
MAKEFLAGS += --silent

buildBingo:
	cd bingo && \
	yarn --frozen-lockfile --non-interactive && \
	yarn build

buildFunctions:
	cd functions/bin && \
	npm i

buildPokemonList:
	cd pokemon-list && \
	npm i && \
	npm run build

buildSwitch:
	cd switch && \
	yarn --frozen-lockfile --non-interactive && \
	yarn build

copyBuilds:
	mv bingo/build build/bingo
	mv pokemon-list/build build/pokemon-list
	mv switch/build build/switch

build: buildBingo buildFunctions buildHungerGames buildPokemonList buildSwitch copyBuilds

.PHONY: build