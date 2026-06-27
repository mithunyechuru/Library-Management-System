import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.*;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

public class LibraryServer {
    static Queue<String> returnQueue = new ConcurrentLinkedQueue<>();
    static Map<String, Integer> borrowMap = new ConcurrentHashMap<>();
    static List<Book> shelf = new CopyOnWriteArrayList<>();
    static Set<String> allBooks = ConcurrentHashMap.newKeySet();
    static Map<String, BorrowedBook> borrowedBooks = new ConcurrentHashMap<>();

    static class Book {
        String bookID;
        int borrowCount;
        
        Book(String id, int count) {
            this.bookID = id;
            this.borrowCount = count;
        }
    }

    static class BorrowedBook {
        String bookID;
        String borrowerName;
        int daysToReturn;
        String borrowDate;
        
        BorrowedBook(String id, String name, int days, String date) {
            this.bookID = id;
            this.borrowerName = name;
            this.daysToReturn = days;
            this.borrowDate = date;
        }
    }

    public static void main(String[] args) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(8000), 0);

        server.createContext("/", exchange -> serveFile(exchange, "index.html", "text/html"));
        server.createContext("/style.css", exchange -> serveFile(exchange, "style.css", "text/css"));
        server.createContext("/script.js", exchange -> serveFile(exchange, "script.js", "application/javascript"));

        server.createContext("/add", exchange -> {
            if ("POST".equals(exchange.getRequestMethod())) {
                try {
                    String body = readBody(exchange);
                    String bookId = URLDecoder.decode(body.split("=")[1], StandardCharsets.UTF_8);
                    
                    if (bookId.isEmpty()) {
                        sendResponse(exchange, 400, "Book ID cannot be empty");
                        return;
                    }

                    if (allBooks.contains(bookId)) {
                        sendResponse(exchange, 400, "Book already exists in library");
                        return;
                    }

                    allBooks.add(bookId);
                    shelf.add(new Book(bookId, 0));
                    borrowMap.put(bookId, 0);
                    
                    sendResponse(exchange, 200, "Book added successfully");
                } catch (Exception e) {
                    sendResponse(exchange, 500, "Error processing request");
                }
            } else {
                sendResponse(exchange, 405, "Method not allowed");
            }
        });

        server.createContext("/borrow", exchange -> {
            if ("POST".equals(exchange.getRequestMethod())) {
                try {
                    String body = readBody(exchange);
                    String[] params = body.split("&");
                    String bookId = URLDecoder.decode(params[0].split("=")[1], StandardCharsets.UTF_8);
                    String borrowerName = URLDecoder.decode(params[1].split("=")[1], StandardCharsets.UTF_8);
                    String days = URLDecoder.decode(params[2].split("=")[1], StandardCharsets.UTF_8);
                    
                    if (bookId.isEmpty() || borrowerName.isEmpty() || days.isEmpty()) {
                        sendResponse(exchange, 400, "All fields are required");
                        return;
                    }

                    Book foundBook = null;
                    for (Book b : shelf) {
                        if (b.bookID.equals(bookId)) {
                            foundBook = b;
                            break;
                        }
                    }

                    if (foundBook != null) {
                        shelf.remove(foundBook);
                        String currentDate = java.time.LocalDate.now().toString();
                        borrowedBooks.put(bookId, new BorrowedBook(bookId, borrowerName, 
                            Integer.parseInt(days), currentDate));
                        sendResponse(exchange, 200, "Book borrowed successfully");
                    } else {
                        sendResponse(exchange, 404, "Book not available");
                    }
                } catch (Exception e) {
                    sendResponse(exchange, 500, "Error processing request");
                }
            } else {
                sendResponse(exchange, 405, "Method not allowed");
            }
        });

        server.createContext("/return", exchange -> {
            if ("POST".equals(exchange.getRequestMethod())) {
                try {
                    String body = readBody(exchange);
                    String bookId = URLDecoder.decode(body.split("=")[1], StandardCharsets.UTF_8);
                    
                    if (bookId.isEmpty()) {
                        sendResponse(exchange, 400, "Book ID cannot be empty");
                        return;
                    }

                    if (!borrowedBooks.containsKey(bookId)) {
                        sendResponse(exchange, 400, "This book wasn't borrowed");
                        return;
                    }

                    if (!returnQueue.contains(bookId)) {
                        returnQueue.add(bookId);
                        borrowedBooks.remove(bookId);
                        sendResponse(exchange, 200, "Book added to return queue");
                    } else {
                        sendResponse(exchange, 400, "Book already in queue");
                    }
                } catch (Exception e) {
                    sendResponse(exchange, 500, "Error processing request");
                }
            } else {
                sendResponse(exchange, 405, "Method not allowed");
            }
        });

        server.createContext("/process-return", exchange -> {
            if ("POST".equals(exchange.getRequestMethod())) {
                try {
                    String bookId = returnQueue.poll();
                    if (bookId != null) {
                        int newCount = borrowMap.getOrDefault(bookId, 0) + 1;
                        borrowMap.put(bookId, newCount);
                        shelf.add(new Book(bookId, newCount));
                        shelf.sort((a, b) -> b.borrowCount - a.borrowCount);
                        sendResponse(exchange, 200, "Book returned to shelf");
                    } else {
                        sendResponse(exchange, 404, "Queue is empty");
                    }
                } catch (Exception e) {
                    sendResponse(exchange, 500, "Error processing return");
                }
            } else {
                sendResponse(exchange, 405, "Method not allowed");
            }
        });

        server.createContext("/getdata", exchange -> {
            try {
                String libraryData = allBooks.stream()
                        .map(id -> "\"" + id + "\"")
                        .collect(Collectors.joining(",", "[", "]"));

                String shelfData = shelf.stream()
                        .map(b -> String.format("{\"bookID\":\"%s\", \"count\":%d}", b.bookID, b.borrowCount))
                        .collect(Collectors.joining(",", "[", "]"));

                String queueData = returnQueue.stream()
                        .map(id -> "\"" + id + "\"")
                        .collect(Collectors.joining(",", "[", "]"));

                String borrowedData = borrowedBooks.values().stream()
                        .map(b -> String.format("{\"bookID\":\"%s\", \"borrower\":\"%s\", \"days\":%d, \"date\":\"%s\"}", 
                            b.bookID, b.borrowerName, b.daysToReturn, b.borrowDate))
                        .collect(Collectors.joining(",", "[", "]"));

                String response = String.format("{\"library\":%s, \"shelf\":%s, \"queue\":%s, \"borrowed\":%s}", 
                        libraryData, shelfData, queueData, borrowedData);

                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, response.getBytes().length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(response.getBytes());
                }
            } catch (Exception e) {
                sendResponse(exchange, 500, "Error generating data");
            }
        });

        server.setExecutor(null);
        server.start();
        System.out.println("Server running at http://localhost:8000/");
    }

    private static void serveFile(HttpExchange exchange, String filename, String contentType) throws IOException {
        File file = new File(filename);
        if (!file.exists()) {
            sendResponse(exchange, 404, "File not found");
            return;
        }

        byte[] bytes = Files.readAllBytes(file.toPath());
        exchange.getResponseHeaders().set("Content-Type", contentType);
        exchange.sendResponseHeaders(200, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static String readBody(HttpExchange exchange) throws IOException {
        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8))) {
            return br.readLine();
        }
    }

    private static void sendResponse(HttpExchange exchange, int statusCode, String message) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", "text/plain");
        byte[] bytes = message.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }
}