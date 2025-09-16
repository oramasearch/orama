import { create, insert, search } from '../dist/esm/index.js'

console.log("Testing exact search fix...\n")

// Create a simple test to reproduce and verify the exact search fix
const db = create({
  schema: {
    path: "string",
    title: "string",
  },
});

const id1 = insert(db, { path: "First Note.md", title: "First Note" });
insert(db, { path: "Second Note.md", title: "Second Note" });
const id3 = insert(db, { path: "first", title: "Just first" });

console.log("Database created and documents inserted");
console.log("Document IDs:", { id1, id3 });

// Test without exact - should find partial matches
const noExact = search(db, {
  term: "first",
  properties: ["path"],
});

console.log("\n=== Search without exact ===");
console.log(`Term: "first", Properties: ["path"]`);
console.log("Count:", noExact.count);
console.log("Results:", noExact.hits.map(h => ({ id: h.id, path: h.document.path })));

// Test with exact - should only match exact property values
const withExact = search(db, {
  term: "first", 
  properties: ["path"],
  exact: true,
});

console.log("\n=== Search with exact: true ===");
console.log(`Term: "first", Properties: ["path"]`);
console.log("Count:", withExact.count);
console.log("Results:", withExact.hits.map(h => ({ id: h.id, path: h.document.path })));

// Test exact match for full path
const exactFullPath = search(db, {
  term: "First Note.md",
  properties: ["path"],
  exact: true,
});

console.log("\n=== Search with exact: true (full path) ===");
console.log(`Term: "First Note.md", Properties: ["path"]`);
console.log("Count:", exactFullPath.count);
console.log("Results:", exactFullPath.hits.map(h => ({ id: h.id, path: h.document.path })));

// Validate results
console.log("\n=== VALIDATION ===");
const success = withExact.count === 1 && 
                withExact.hits[0].id === id3 &&
                exactFullPath.count === 1 &&
                exactFullPath.hits[0].id === id1;

if (success) {
  console.log("✅ EXACT SEARCH FIX IS WORKING!");
  console.log("- Searching for 'first' with exact:true only matches documents where path is exactly 'first'");
  console.log("- Searching for 'First Note.md' with exact:true matches the correct document");
} else {
  console.log("❌ EXACT SEARCH FIX IS NOT WORKING");
  console.log("Expected: withExact.count=1, withExact.hits[0].id=" + id3);
  console.log("Expected: exactFullPath.count=1, exactFullPath.hits[0].id=" + id1);
}
