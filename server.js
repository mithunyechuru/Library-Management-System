const http = require('http');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

const PORT = 8000;

// In-memory State mirroring LibraryServer.java
let returnQueue = []; // Array as Queue (FIFO)
let borrowMap = {};   // Map of bookID -> borrowCount
let shelf = [];       // Array of { bookID, count }
let allBooks = new Set(); // Set of all bookIDs
let borrowedBooks = {};   // Map of bookID -> { bookID, borrowerName, daysToReturn, borrowDate }

const server = http.createServer((req, res) => {
  const url = req.url;
  const method = req.method;

  // Helper to send text/plain response
  function sendResponse(statusCode, message) {
    res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(message);
  }

  // Helper to serve static files
  function serveFile(filename, contentType) {
    const filePath = path.join(__dirname, filename);
    fs.readFile(filePath, (err, content) => {
      if (err) {
        sendResponse(404, 'File not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  }

  // Helper to read POST body
  function readBody(callback) {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      callback(querystring.parse(body));
    });
  }

  // Routes
  if (method === 'GET' && (url === '/' || url === '/index.html')) {
    serveFile('index.html', 'text/html');
  } else if (method === 'GET' && url === '/style.css') {
    serveFile('style.css', 'text/css');
  } else if (method === 'GET' && url === '/script.js') {
    serveFile('script.js', 'application/javascript');
  } else if (method === 'POST' && url === '/add') {
    readBody((params) => {
      const bookId = (params.bookID || '').trim();
      if (!bookId) {
        return sendResponse(400, 'Book ID cannot be empty');
      }
      if (allBooks.has(bookId)) {
        return sendResponse(400, 'Book already exists in library');
      }

      allBooks.add(bookId);
      shelf.push({ bookID: bookId, count: 0 });
      borrowMap[bookId] = 0;

      sendResponse(200, 'Book added successfully');
    });
  } else if (method === 'POST' && url === '/borrow') {
    readBody((params) => {
      const bookId = (params.bookID || '').trim();
      const borrowerName = (params.borrowerName || '').trim();
      const days = (params.days || '').trim();

      if (!bookId || !borrowerName || !days) {
        return sendResponse(400, 'All fields are required');
      }

      const foundIndex = shelf.findIndex(b => b.bookID === bookId);
      if (foundIndex !== -1) {
        shelf.splice(foundIndex, 1); // remove from shelf
        const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        borrowedBooks[bookId] = {
          bookID: bookId,
          borrower: borrowerName,
          days: parseInt(days, 10),
          date: currentDate
        };
        sendResponse(200, 'Book borrowed successfully');
      } else {
        sendResponse(404, 'Book not available');
      }
    });
  } else if (method === 'POST' && url === '/return') {
    readBody((params) => {
      const bookId = (params.bookID || '').trim();
      if (!bookId) {
        return sendResponse(400, 'Book ID cannot be empty');
      }
      if (!borrowedBooks[bookId]) {
        return sendResponse(400, "This book wasn't borrowed");
      }
      if (returnQueue.includes(bookId)) {
        return sendResponse(400, 'Book already in queue');
      }

      returnQueue.push(bookId);
      delete borrowedBooks[bookId];
      sendResponse(200, 'Book added to return queue');
    });
  } else if (method === 'POST' && url === '/process-return') {
    const bookId = returnQueue.shift(); // poll (remove from front)
    if (bookId) {
      const newCount = (borrowMap[bookId] || 0) + 1;
      borrowMap[bookId] = newCount;
      shelf.push({ bookID: bookId, count: newCount });
      // Sort shelf by count descending
      shelf.sort((a, b) => b.count - a.count);
      sendResponse(200, 'Book returned to shelf');
    } else {
      sendResponse(404, 'Queue is empty');
    }
  } else if (method === 'GET' && url === '/getdata') {
    const responseData = {
      library: Array.from(allBooks),
      shelf: shelf,
      queue: returnQueue,
      borrowed: Object.values(borrowedBooks)
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(responseData));
  } else {
    sendResponse(404, 'Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
