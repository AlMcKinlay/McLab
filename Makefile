#!make
MAKEFLAGS += --silent

buildBingo:
	cd bingo && \
	npm i && \
	npm run build && \
	cd ..

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

buildGameDraft:
	cd game-draft && \
	npm i && \
	npm run build && \
	cd ..

copyBuilds:
	rm -rf build
	mkdir -p build
	mv bingo/build build/bingo
	mv pokemon-list/build build/pokemon-list
	mv switch/build build/switch
	mv game-draft/build build/game-draft
	cp homepage/* build/

build: buildBingo buildFunctions buildPokemonList buildSwitch buildGameDraft copyBuilds

.PHONY: build