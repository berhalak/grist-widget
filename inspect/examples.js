const examples = [
  {
    code: `
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// CAUTION: DO NOT PASTE HERE CODE YOU DON'T TRUST.
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

// Welcome in the Grist API Explorer. It is a place where you
// can explore our API. On the upper left corner you have some
// examples to follow and learn about Grist API.

// To start press F9 (or the green button on the right) to execute
// following line of code.
show("Hello world");

// You can use this global method to inspect data that come from
// Grist, of course console.log also works as expected.

// All code is run inside your browser, but all the API calls are
// real and can ready or sometimes modify your data.

// Feel free to experiment and change this code however you like.`.trim(),
    title: 'Hello world',
  },
  {
    code: `
// First this widget access level to "No document access", and then run
// the code below.

grist.ready({
  requiredAccess: 'read table'
});

// On the creator panel you will see a prompt to change access level.
// When you accept, this widget will be reloaded with a new access level granted.
// After reload, execute this code one more time to see that the access level
// was changed.

// Experiment a little, with diffrent access level requests
// - none
// - read table
// - full

grist.onOptions((options, iteraction) => {
  show("Current access level " + iteraction.accessLevel);
});
`.trimEnd(),
    title: 'Request access level',
    group: 'Basics',
  },
  {
    code: `
// To read data from the underlying table
grist.ready({
  requiredAccess: 'read table'
});

// And then subscribe to onRecords event to receive all the records
grist.onRecords((data) => {
  show(data);
});

// Press F9 (or Exeucte) to run this code, and then
// update, add, or delete some records in the table.

// To read active record from the table.
grist.ready({
  requiredAccess: 'read table'
});

// And then subscribe to onRecords event to receive all the records
grist.onRecord((data) => {
  show(data);
});

// Press F9 (or Exeucte) to run this code, and change active cursor
// in the table on the left to see what data is send.

// Also experiment with VISIBLE COLUMNS section in the creator panel
// to see what columns are sent to the widget.`,
    title: 'Reading active record',
    group: "Basics"
  },
  {
    code: `
// How to map records.
grist.ready({
  requiredAccess: 'read table',
  columns: ['Link', 'Title']
});

// Subscribe to active record, and see what gets send from the grist.
grist.onRecord((record, mapping) => {
  show({
    record,
    mapped: grist.mapColumnNames(record),
    mapping
  });
});

// Experiment with by providing diffrent mappings,
// removing and renaming columns.
`,
    title: 'Mapping columns',
    group: "Basics"
  },

  {
    code: `
// How to map records.
grist.ready({
  requiredAccess: 'read table'
});

// Here is how you can fetch record by id.
show(await grist.docApi.fetchSelectedRecord(2));

// Here is how you can fetch all records in the table
// Uncomment line below, to see what will happen.
// show(await grist.docApi.fetchSelectedTable());

// Here is how you can fetch all records in the table
// Uncomment line below, to see what will happen.
// show(await grist.docApi.fetchTable('Table1'));
`,
    title: 'Fetching data',
    group: "Grist API"
  },
];
