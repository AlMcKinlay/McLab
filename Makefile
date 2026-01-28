#!make
MAKEFLAGS += --silent

buildBingo:
	cd bingo && \
	npm i && \
	npm run build

buildFunctions:
	cd functions/bin && \
	npm i

buildPokemonList:
	cd pokemon-list && \
	npm i && \
	npm run build

buildSwitch:
	cd switch && \
	npm i && \
	npm run build

copyBuilds:
	mv bingo/build build/bingo
	mv pokemon-list/build build/pokemon-list
	mv switch/build build/switch

build: buildBingo buildFunctions buildPokemonList buildSwitch copyBuilds

.PHONY: build