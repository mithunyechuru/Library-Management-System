function addBook() {
  const bookId = document.getElementById('bookInput').value.trim();
  if (!bookId) {
    alert("Please enter a book ID");
    return;
  }

  fetch('/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `bookID=${encodeURIComponent(bookId)}`
  })
  .then(response => {
    if (!response.ok) throw new Error(response.statusText);
    return response.text();
  })
  .then(message => {
    alert(message);
    document.getElementById('bookInput').value = '';
    refreshData();
  })
  .catch(error => {
    alert(`Error: ${error.message}`);
  });
}

function borrowBook() {
  const bookId = document.getElementById('bookInput').value.trim();
  if (!bookId) {
    alert("Please enter a book ID");
    return;
  }

  const formHtml = `
    <div id="borrowForm" class="borrow-form">
      <h3>Borrow: ${bookId}</h3>
      <div class="form-group">
        <label for="borrowerName">Borrower Name:</label>
        <input type="text" id="borrowerName" placeholder="Enter name" required>
      </div>
      <div class="form-group">
        <label for="daysToReturn">Days to Return:</label>
        <input type="number" id="daysToReturn" min="1" value="7" required>
      </div>
      <div class="form-buttons">
        <button class="btn btn-confirm" onclick="submitBorrow('${bookId}')">Confirm</button>
        <button class="btn btn-cancel" onclick="document.getElementById('borrowForm').remove()">Cancel</button>
      </div>
    </div>
  `;
  
  const formContainer = document.querySelector('.form');
  const existingForm = document.getElementById('borrowForm');
  if (existingForm) existingForm.remove();
  formContainer.insertAdjacentHTML('afterend', formHtml);
  document.getElementById('borrowerName').focus();
}

function submitBorrow(bookId) {
  const borrowerName = document.getElementById('borrowerName').value.trim();
  const daysToReturn = document.getElementById('daysToReturn').value.trim();
  
  if (!borrowerName || !daysToReturn) {
    alert("Please fill all fields");
    return;
  }

  fetch('/borrow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `bookID=${encodeURIComponent(bookId)}&borrowerName=${encodeURIComponent(borrowerName)}&days=${encodeURIComponent(daysToReturn)}`
  })
  .then(response => {
    if (!response.ok) throw new Error(response.statusText);
    return response.text();
  })
  .then(message => {
    alert(message);
    document.getElementById('borrowForm').remove();
    document.getElementById('bookInput').value = '';
    refreshData();
  })
  .catch(error => {
    alert(`Error: ${error.message}`);
  });
}

function returnBook() {
  const bookId = document.getElementById('bookInput').value.trim();
  if (!bookId) {
    alert("Please enter a book ID");
    return;
  }

  fetch('/return', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `bookID=${encodeURIComponent(bookId)}`
  })
  .then(response => {
    if (!response.ok) throw new Error(response.statusText);
    return response.text();
  })
  .then(message => {
    alert(message);
    document.getElementById('bookInput').value = '';
    refreshData();
  })
  .catch(error => {
    alert(`Error: ${error.message}`);
  });
}

function processReturn(bookId) {
  fetch('/process-return', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `bookID=${encodeURIComponent(bookId)}`
  })
  .then(response => {
    if (!response.ok) throw new Error(response.statusText);
    return response.text();
  })
  .then(message => {
    alert(message);
    refreshData();
  })
  .catch(error => {
    alert(`Error: ${error.message}`);
  });
}

function calculateReturnDate(borrowDate, days) {
  const date = new Date(borrowDate);
  date.setDate(date.getDate() + parseInt(days));
  return date.toISOString().split('T')[0];
}

function daysRemaining(returnDate) {
  const today = new Date();
  const returnDay = new Date(returnDate);
  const diffTime = returnDay - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

function refreshData() {
  fetch('/getdata')
    .then(response => {
      if (!response.ok) throw new Error("Failed to fetch data");
      return response.json();
    })
    .then(data => {
      document.getElementById('libraryCount').textContent = data.library.length;
      document.getElementById('shelfCount').textContent = data.shelf.length;
      document.getElementById('queueCount').textContent = data.queue.length;
      document.getElementById('borrowedCount').textContent = data.borrowed.length;

      const libraryList = document.getElementById('libraryList');
      libraryList.innerHTML = "";
      data.library.forEach(id => {
        const li = document.createElement('li');
        li.innerHTML = `
          <div class="book-info">
            <span>📕 ${id}</span>
          </div>
        `;
        libraryList.appendChild(li);
      });

      const shelfList = document.getElementById('shelfList');
      shelfList.innerHTML = "";
      data.shelf.forEach(b => {
        const li = document.createElement('li');
        li.innerHTML = `
          <div class="book-info">
            <span>📗 ${b.bookID}</span>
            <small>(${b.count} borrows)</small>
          </div>
        `;
        shelfList.appendChild(li);
      });

      const queueList = document.getElementById('queueList');
      queueList.innerHTML = "";
      data.queue.forEach(id => {
        const li = document.createElement('li');
        li.innerHTML = `
          <div class="book-info">
            <span>🔁 ${id}</span>
          </div>
          <button class="process-btn" onclick="processReturn('${id}')">Process</button>
        `;
        queueList.appendChild(li);
      });

      const borrowedTableBody = document.getElementById('borrowedTableBody');
      borrowedTableBody.innerHTML = "";
      if (data.borrowed && data.borrowed.length > 0) {
        data.borrowed.forEach(b => {
          const returnDate = calculateReturnDate(b.date, b.days);
          const daysLeft = daysRemaining(returnDate);
          const statusClass = daysLeft <= 3 ? 'status-due' : 'status-ok';
          const statusText = daysLeft <= 3 ? `Due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}!` : `${daysLeft} days left`;
          
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${b.bookID}</td>
            <td>${b.borrower}</td>
            <td>${b.date}</td>
            <td>${returnDate}</td>
            <td class="${statusClass}">${statusText}</td>
          `;
          borrowedTableBody.appendChild(row);
        });
      }
    })
    .catch(error => {
      console.error("Error refreshing data:", error);
    });
}

function toggle(id) {
  const el = document.getElementById(id + 'List');
  el.classList.toggle('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  refreshData();
  document.getElementById('bookInput').focus();
});