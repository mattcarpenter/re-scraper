import axios, { AxiosRequestConfig } from 'axios';
import { mapLimit } from 'async';
import { writeFile, mkdir, readFile } from 'fs/promises';

const MAX_CONCURRENT_REQUESTS = 1;
const APARTMENT_PAGES_DIRECTORY = './apartment-pages';

const cookies = {
  '_member_session_id': 'y0pnlzryzhumq3x2pa2glksj5ac9ownpar8bcgzzm3q0rqi056q4ts6xytt0y8at',
  'session_site': '75rgn2kma1r5ou9gs2lf9truo1',
  'is_mosaic': '0',
};

const cookieString = Object.entries(cookies)
  .map(([key, value]) => `${key}=${value}`)
  .join('; ');

const axiosConfig: AxiosRequestConfig = {
  headers: {
    'Cookie': cookieString,
  },
};

async function main() {
  const urls: string[] = JSON.parse(await readFile('./apartments.json', 'utf-8'));

  try {
    await mkdir(APARTMENT_PAGES_DIRECTORY);
  } catch (e: any) {
    if (e.code !== 'EEXIST') throw e;
  }
  let urlsScraped = 1;
  await mapLimit(urls, MAX_CONCURRENT_REQUESTS, async (url: string, callback) => {
    console.log(`[${urlsScraped++} / ${urls.length}] Scraping ${url}...`);
    const filename = url.split('/').pop();
    try {
      const {data} = await axios.get(url, axiosConfig);
      await writeFile(`${APARTMENT_PAGES_DIRECTORY}/${filename}`, data);
    } catch (error) {
      console.error(`error getting url ${url}`, error);
    }
    //await sleep(500);
    callback(null);
  });
}

main().catch(console.error);
function sleep(time: number) {
  return new Promise(resolve => {
    setTimeout(resolve, time);
  });
}
