import { useState } from 'react';

import PokemonList from './PokemonList';
import Filter from './Filter';

function SelectionList({selectPokemon}) {
    const [filter, setFilter] = useState({name: "Ch"});
    let getTop = () => {};
    const getGetTop = (func) => {
        getTop = func;
    }
    const selectTop = () => {
        selectPokemon(getTop());
    }

    return (
        <div className="list">
            <Filter filter={filter} setFilter={setFilter} selectTop={selectTop}></Filter>
            <PokemonList filter={filter} selectPokemon={selectPokemon} getGetTop={getGetTop}></PokemonList>
        </div>
    );
}

export default SelectionList;
