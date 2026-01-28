import fetchJsonp from "fetch-jsonp";
import cheerio from "cheerio";

export const REGIONS = {
	EU: "Europe",
	NA: "USA",
};

const PRICE = {};
PRICE[250] =
	"price_lowest_f%3A%220%22%20OR%20price_lowest_f%3A%5B0.01%20TO%202.49%5D";
PRICE[500] = PRICE[250] + "%20OR%20price_lowest_f%3A%5B2.5%20TO%204.99%5D";

export const getMetacritic = (name) =>
	fetch(
		`https://cors-anywhere.herokuapp.com/https://www.metacritic.com/search/game/${name}/results?plats[268409]=1&search_type=advanced`
	)
		.then((res) => res.text())
		.then((html) => cheerio.load(html))
		.then(($) => {
			return {
				score: $(".metascore_w")[0] && $(".metascore_w")[0].children[0].data,
				url:
					$(".product_title")[0] &&
					$(".product_title")[0].children[1].attribs.href,
			};
		});

export const regions = {
	[REGIONS.EU]: {
		fetch: (num, getUrl) =>
			fetchJsonp(getUrl(num), {
				jsonpCallback: "callback" + num,
				jsonpCallbackFunction: "callback" + num,
			}).then((response) => response.json()),
		getURL: (num) =>
			`https://searching.nintendo-europe.com/en/select?q=*&fq=type%3AGAME%20AND%20((price_has_discount_b%3A"true")%20AND%20(${
				PRICE[500]
			}))%20AND%20sorting_title%3A*%20AND%20*%3A*&sort=price_sorting_f%20asc&start=${
				num * 24
			}&rows=24&wt=json&bf=linear(ms(priority%2CNOW%2FHOUR)%2C1.1e-11%2C0)&json.wrf=callback${num}`,
		method: "GET",
		getNumHits: (data) => data.response.numFound,
		reduce: (val) => val.response.docs,
		map: (game) => ({
			title: game.title,
			url: `https://www.nintendo.co.uk${game.url}`,
			price: game.price_sorting_f,
			original:
				Math.round(
					(game.price_sorting_f / (100 - game.price_discount_percentage_f)) *
						100 *
						100
				) / 100,
			discount: game.price_discount_percentage_f,
		}),
	},
	[REGIONS.NA]: {
		fetch: (num, getUrl, method, getBody) =>
			fetch(getUrl(num), { method, body: JSON.stringify(getBody(num)) }).then(
				(res) => res.json()
			),
		getURL: () =>
			`https://u3b6gr4ua3-dsn.algolia.net/1/indexes/*/queries?x-algolia-agent=Algolia%20for%20JavaScript%20(3.33.0)%3B%20Browser%20(lite)%3B%20JS%20Helper%202.20.1&x-algolia-application-id=U3B6GR4UA3&x-algolia-api-key=9a20c93440cf63cf1a7008d75f7438bf`,
		method: "POST",
		getBody: (num) => ({
			requests: [
				{
					indexName: "noa_aem_game_en_us_price_asc",
					params: `query=&hitsPerPage=24&maxValuesPerFacet=30&page=${num}&facets=%5B%22generalFilters%22%2C%22platform%22%2C%22availability%22%2C%22categories%22%2C%22filterShops%22%2C%22virtualConsole%22%2C%22characters%22%2C%22priceRange%22%2C%22esrb%22%2C%22filterPlayers%22%5D&tagFilters=&facetFilters=%5B%5B%22platform%3ANintendo%20Switch%22%5D%2C%5B%22generalFilters%3ADeals%22%5D%5D`,
				},
			],
		}),
		getNumHits: (data) => data.results[0].nbHits,
		reduce: (val) => val.results[0].hits,
		map: (game) => ({
			title: game.title,
			price: game.salePrice,
			original: game.msrp,
			discount: ((game.msrp - game.salePrice) / game.msrp) * 100,
		}),
	},
};
