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

copyBuilds:
	rm -rf build
	mkdir -p build
	mv bingo/build build/bingo
	mv pokemon-list/build build/pokemon-list
	mv switch/build build/switch
	cp homepage/* build/

build: buildBingo buildFunctions buildPokemonList buildSwitch copyBuilds

.PHONY: build