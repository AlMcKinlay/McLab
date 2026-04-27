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

buildPokemonDexSort:
	cd pokemon-dex-sort && \
	npm i && \
	npm run build

buildSwitch:
	cd switch && \
	npm i && \
	npm run build

buildGameDraft:
	cd game-draft && \
	npm i && \
	npm run build

buildTicTacToe:
	cd tic-tac-toe && \
	npm i && \
	npm run build

buildRanker:
	cd ranker && \
	npm i && \
	npm run build

copyBuilds:
	rm -rf build
	mkdir -p build
	mv bingo/build build/bingo
	mv pokemon-list/build build/pokemon-list
	mv pokemon-dex-sort/build build/pokemon-dex-sort
	mv switch/build build/switch
	mv game-draft/build build/game-draft
	mv tic-tac-toe/build build/tic-tac-toe
	mv ranker/build build/ranker
	cp homepage/* build/
	cp shared/theme-variables.css build/

build: npm_install \
	buildBingo \
	buildFunctions \
	buildPokemonList \
	buildPokemonDexSort \
	buildSwitch \
	buildGameDraft \
	buildTicTacToe \
	buildRanker \
	copyBuilds

npm_install:
	npm install

.PHONY: build npm_install