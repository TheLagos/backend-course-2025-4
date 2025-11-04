import http from 'http';
import fs from 'fs';
import url from 'url';
import { program } from 'commander';
import { XMLBuilder } from 'fast-xml-parser';

program.helpOption('-H, --help', 'Help menu')
program.option('-i, --input <path>', "File path")
program.option('-h, --host <address>', "Server address")
program.option('-p, --port <number>', "Server port");

program.parse(process.argv);
const options = program.opts();

if (!options.input || !options.host || !options.port) {
  console.error('The required parametr isn\'t specified');
  program.help();
  process.exit(1);
}

const input_file_path = options.input;

const builder = new XMLBuilder({
    format: true,
});

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const queryParams = parsedUrl.query;

  fs.readFile(input_file_path, 'utf8', (error, fileContent)=> {
    if (error) {
      if (error.code === 'ENOENT') {
        console.error('Cannot find input file');
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Cannot find input file');
      } else {
        console.error('Internal Server Error');
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Internal Server Error');
      }
      return;
    }

    let data;
    try {
      data = JSON.parse(fileContent);
    }
    catch (parseError) {
      console.error("Error parsing JSON");
      res.writeHead(500, {'Content-Type': 'text/plain; charset=utf-8'});
      res.end('Parse JSON error');
      return;
    }

    let processedData = data;

    if (queryParams.min_rainfall) {
      const minRain = parseFloat(queryParams.min_rainfall);
      processedData = processedData.filter(item => item.Rainfall > minRain);
    } 

    const mappedData = processedData.map(item => {
      const record = {
        rainfall: item.Rainfall,
        pressure3pm: item.Pressure3pm,
      };

      if (queryParams.humidity === 'true') {
        record.humidity = item.Humidity3pm;
      }
      return record;
    });

    const xmlObject = {
      weather_data: {
        record: mappedData
      }
    };

    try {
      const xmlString = builder.build(xmlObject);
      res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
      res.end(xmlString);

    } catch (error) {
      console.error('Error generating XML');
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Error generating XML');
    }
  });
});

server.listen(options.port, options.host, () => {
  console.log(`Сервер успішно запущено, слухає на http://${options.host}:${options.port}`);
});