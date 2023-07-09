import axios from 'axios';
import cheerio from 'cheerio';
import async from 'async';
import fs from 'fs';

// The provided list of city page URLs
const cityUrls = [
  'https://db.self-in.com/city/659.html', // chiyoda
  'https://db.self-in.com/city/671.html', // shibuya
  'https://db.self-in.com/city/668.html', // meguro
  'https://db.self-in.com/city/661.html', // minato
  'https://db.self-in.com/city/662.html', // shinjuku
  'https://db.self-in.com/city/670.html' // setagaya
];

// Function to fetch the webpage HTML
async function fetchHtml(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: {
        Cookie: '_member_session_id=y0pnlzryzhumq3x2pa2glksj5ac9ownpar8bcgzzm3q0rqi056q4ts6xytt0y8at; session_site=75rgn2kma1r5ou9gs2lf9truo1',
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch ${url}`);
    throw error;
  }
}

// Function to extract the last page number from the pagination
function extractLastPageNumber($: cheerio.Root): number {
  const $lastChild = $('.paging a').last();
  const isNextButton = $lastChild.text() === '次の20件';

  if (isNextButton) {
    return parseInt($('.paging a').eq(-2).text(), 10);
  }

  return parseInt($lastChild.text(), 10);
}

// Function to scrape the apartment URLs from a city page
async function scrapeCityPage(cityUrl: string): Promise<string[]> {
  const cityHtml = await fetchHtml(cityUrl);
  const $ = cheerio.load(cityHtml);

  const lastPageNumber = extractLastPageNumber($);

  const apartmentUrls: string[] = [];

  const addUrlsFromCurrentPage = ($context: cheerio.Root) => {
    $context('h3.name a').each((_index, element) => {
      const apartmentUrl = $(element).attr('href');
      apartmentUrls.push(apartmentUrl as string);
    });
  };

  addUrlsFromCurrentPage($);

  // Scrape paginated pages
  await async.mapLimit(
    Array.from({ length: lastPageNumber - 1 }, (_, i) => i + 2),
    5,
    async (page: number, callback) => {
      console.log(`loading page [${page}] of [${lastPageNumber}] for city page [${cityUrl}]`);
      const paginatedUrl = cityUrl.replace('.html', `_${page}.html`);
      const paginatedHtml = await fetchHtml(paginatedUrl);
      const $paginated = cheerio.load(paginatedHtml);

      addUrlsFromCurrentPage($paginated);
      callback();
    }
  );

  return apartmentUrls;
}


(async () => {
  const allApartmentUrls: string[] = [];

  for (const cityUrl of cityUrls) {
    try {
      const apartmentUrls = await scrapeCityPage(cityUrl);
      allApartmentUrls.push(...apartmentUrls);
    } catch (error) {
      console.error('Error during scraping:', error);
    }
  }

  try {
    fs.writeFileSync('apartments.json', JSON.stringify(allApartmentUrls, null, 2));
    console.log('Apartment URLs saved to apartments.json');
    console.log('All apartment URLs:', allApartmentUrls);
  } catch (err) {
    console.log('error saving json');
  }
})();
