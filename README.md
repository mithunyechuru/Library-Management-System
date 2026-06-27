# 📚 Library Management System & Shelf Optimizer

A premium, interactive Library Management System featuring real-time dashboard analytics. This project showcases how core Data Structures and Algorithms (DSA) solve real-world shelf-placement, queueing, and lookup problems.

The backend is available in two implementations:
- **Java**: Built-in HTTP server (`LibraryServer.java`)
- **Node.js**: A high-performance, dependency-free Javascript fallback (`server.js`)

---

## 🛠️ Tech Stack
- **Frontend**: Vanilla HTML5, CSS3 (Modern dark-themed Glassmorphism UI), and Javascript.
- **Backend Options**: 
  - **Java JDK 17+** (using `com.sun.net.httpserver`)
  - **Node.js v24+** (using built-in `http`, `fs`, `path`, `querystring` modules)

---

## 🧠 Data Structures & Algorithms (DSA) Architecture

This project is built around the following key DSA concepts to optimize performance, memory lookup, and shelving logic:

### 1. Data Structures Used

| Data Structure | Code Implementation | Use Case in Project | Time Complexity |
| :--- | :--- | :--- | :--- |
| **Set** | `HashSet` / `ConcurrentHashMap.newKeySet()` | **Ecosystem Index**: Stores all unique book IDs in the library. Prevents duplicate registrations. | Lookup: $O(1)$ <br> Insertion: $O(1)$ |
| **Hash Map** | `HashMap` / `ConcurrentHashMap` | **Active Borrow Registry**: Maps `bookID` to details (`borrowerName`, `date`, `duration`). <br>**Frequency Counter**: Maps `bookID` to total borrow counts. | Lookup: $O(1)$ <br> Insertion: $O(1)$ |
| **List (Array)** | `ArrayList` / `CopyOnWriteArrayList` | **Physical Shelf**: Sequential storage of books available for borrowing. | Traversal: $O(N)$ |
| **Queue** | `Queue` / `ConcurrentLinkedQueue` | **Return Processing Queue**: FIFO (First-In-First-Out) holding queue for returned books before they are checked back onto the shelf. | Enqueue: $O(1)$ <br> Dequeue: $O(1)$ |

---

### 2. Algorithmic Optimizations

#### 🎯 Shelf Optimization (Frequency Sorting)
In physical libraries, placing popular books in highly accessible locations is critical. This project implements a **Shelf Optimization Algorithm**:
* Every time a book is returned and processed, its borrow counter is incremented.
* The available shelf array list is re-sorted dynamically:
  ```js
  shelf.sort((a, b) => b.count - a.count); // Node.js version
  ```
  ```java
  shelf.sort((a, b) => b.borrowCount - a.borrowCount); // Java version
  ```
* **Result**: The most frequently borrowed books naturally float to the top of the shelf array (simulating placing them on the most accessible physical shelves).

#### ⏱️ Lookup & State Checking
* **O(1) Uniqueness Verification**: Before a book is added, checking if it already exists takes $O(1)$ time by querying the `allBooks` Set instead of doing a linear search through the shelf.
* **FIFO Returns**: Using a Queue ensures that returns are processed fairly in the order they were submitted.

---

## ⚙️ Setup & How to Run

### Option 1: Running with Node.js (Recommended - Zero Dependencies)
If Java is not configured in your system path, you can run the server directly using Node.js:
1. Open your terminal in the project directory.
2. Run the start command:
   ```bash
   node server.js
   ```
3. Open **[http://localhost:8000](http://localhost:8000)** in your browser.

### Option 2: Running with Java
If you have Java JDK installed:
1. Compile the server:
   ```bash
   javac LibraryServer.java
   ```
2. Run the compiled class:
   ```bash
   java LibraryServer
   ```
3. Open **[http://localhost:8000](http://localhost:8000)** in your browser.

---

## 📈 Git & GitHub Sync

The project is synchronized with GitHub:
```bash
Repository: https://github.com/mithunyechuru/Library-Management-System
Branch: main
```
To push any new local updates:
```bash
git add .
git commit -m "Your update message"
git push origin main
```
