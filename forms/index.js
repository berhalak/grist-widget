import {cssWrap, cssEditMode, cssEditWrap, col, row, SAMPLE_FORM} from './ui.mjs';
const {dom, observable, computed, styled, Observable} = grainjs;
const urlParams = new URLSearchParams(window.location.search);
const isReadOnly = urlParams.get('readonly') === 'true' ||
  (urlParams.has('access') && urlParams.get('access') !== 'full');

// We are in module, so dom is already loaded.
grist.ready({
  requiredAccess: 'full',
  onEditOptions: () => showEditor(),
});


// #####################################################
// UI Elements

// We have 2 modes here, first we show blank page and just wait for the initial configuration.

// We will wait for this to either be null or contain a form.
const uiStyle = observable(undefined);
let settings = {};
once('Options', (o, s) => {
  settings = s;
  uiStyle.set(s.style);
});

// We also want to wait for some rows to be sent to use.
const rows = observable(undefined);
listen('Records', (r) => rows.set(r));

// Now having those 2, we can create event that will either show the form or the editor.
const mode = computed((use) => {
  if (use(uiStyle) === 'custom' && use(rows)) {
    return 'view';
  } else if (use(uiStyle) === 'full') {
    return 'edit';
  } else {
    return 'wait';
  }
});

// Ok so now we can finally create the UI, that will either show the form or the editor when
// we have started.
dom.update(document.body,
  dom.domComputed(mode, (mode) => {
    if (mode === 'wait') {
      return dom('div', null); // do nothing
    } else if (mode === 'view') {
      return dom.create(view);
    } else if (mode === 'edit') {
      return dom.create(edit);
    }
  })
);

// We also will need to listen for some events, like when user clicks on a row in the table.
const currentRow = observable(null);
listen('Record', (r) => currentRow.set(r));



// Lets build basic editor UI.
function edit(owner) {
  // We have very simple layout with 4 windows.
  // Top left corner there is a logo and a button to add new form.
  // Below we have a list of forms.
  // Top right corner we have some buttons like 'Edit', 'Save', 'Map', 'Publish'.
  // Below we have a form builder or other content based on which button is selected.

  const page = Observable.create(owner, 'edit');
  const nextPage = Observable.create(owner, null);
  const builder = buildBuilder();
  const renderer = buildRenderer();

  owner.autoDispose(nextPage.addListener(async (next) => {
    if (next === 'preview') {
      renderer.model.setForm(builder.form.get() ||{});      
    }
    page.set(next);
  }));

  // Whenever builder form changes, we want to save it.
  owner.autoDispose(builder.form.addListener((form) => {
    updateForm(currentRow.get()?.id, form);
  }));

  // WHen the current row changes, we want to update the builder.
  owner.autoDispose(currentRow.addListener((row) => {
    builder.setForm(parse(row?.FormJson));
    renderer.model.setForm(parse(row?.FormJson));
  }));

  return div('',
    div('box bottom right top: 70px; left: 200px; overflow:unset; padding: 15px;',
      dom.update(builder, dom.show(use => use(page) === 'edit')),
      tab('preview', renderer),
      tab('map', dom.domComputed(currentRow, (row) => {
        if (!row?.FormJson) {return null;}
        const json = parse(row.FormJson);
        return dom('div',
          'Here you will map fields to the columns of the table.',
          json.components.map(c => c.key).map(key => dom('div', key)),
        );
      })),
      tab('publish', dom.maybe(currentRow, (row) => dom('div', 
        dom('div', 'Here you will save the form as HTML page and offer a way to copy it to the clipboard.'),
        dom('div', 'And show the link below for the hosted form:'),
        dom('a', {href: row.Link, _target: 'parent'}, 'Link to hosted'),
      ))),
    ),
    div('box fixed top left height: 70px; width: 190px; border: 1px solid #ddd;', 
      div('btn btn-primary box center', 'New form', click(createNewForm)),
    ),
    div('box fixed top right flex hor end  padding: 10px; gap: 10px; align-items: center; left: 190px; height: 70px; border: 1px solid #ddd; background: white;',
      tabHeader('Edit', 'edit'),
      tabHeader('Preview', 'preview'),
      tabHeader('Map', 'map'),
      tabHeader('Publish', 'publish'),
    ),
    div('box fixed bottom left top: 70px; width: 190px; border: 1px solid #ddd;', dom.create(navigation, {
      onSelect: (row) => grist.setCursorPos({rowId: row.id}),
      selected: currentRow,
    })),
  );

  function tabHeader(text, name) {
    return div('btn', text,
      click(() => nextPage.set(name)),
      dom.cls('btn-primary', use => use(page) === name),
      dom.cls('btn-outline-primary', use => use(page) !== name),
    );
  }

  function parse(formJson) {
    if (!formJson) {return {};}
    try {
      return JSON.parse(formJson);
    } catch (e) {
      return {};
    }
  }

  function tab(name, content) {
    return dom('div', content, dom.show(use => use(page) === name));
  }
}

function view(owner) {
  const renderer = buildRenderer();
  renderer.wait.then(() => {
    
    let row = rows.get()[0];

    if (rows.get().length > 1) {
      const parentURL = new URL(settings.currentUrl);
      const Form_ = parentURL.searchParams.get('Form_');
      row = rows.get().find(r => r.Form === Form_);

    }

    renderer.model.setForm(JSON.parse(row.FormJson));
  })
  return div('padding: 12px;', renderer);
}

function navigation(owner, {
  onSelect,
  selected
} = {}) {
  return div('flex max-height: 100%; overflow: auto;',
    dom.maybe(rows, (rows) => [
      rows.map((row) => cssNavItem(
        row.Name,
        click(() => onSelect(row)),
        cssNavItem.cls('-selected', use => use(selected)?.id === row.id),
      )),
    ]),
  );
}

const cssNavItem = styled('div', `
  padding: 10px;
  cursor: pointer;
  &:hover {
    background: #eee;
  }
  &-selected {
    background: #ddd;
  }
`);

// #####################################################
// Fix some shortcoming of JavaScript and Grist library.

function click(callback) {
  if (!callback) {return;}
  return dom.on('click', callback);
}

// function saveForm(form) {
//   return grist.setOption('formJson', form);
// }

function showEditor() {
  editMode.set(true);
}

function haveFullAccess() {
  return urlParams.get('access') === 'full';
}

// First is the method to actually return a column info.
async function getColumns() {
  const tableId = grist.getSelectedTableIdSync();
  const tables = await grist.docApi.fetchTable('_grist_Tables');
  const columns = await grist.docApi.fetchTable('_grist_Tables_column');
  const fields = Object.keys(columns);
  const colIds = columns.colId;
  const tableRef = tables.id[tables.tableId.indexOf(tableId)];
  return colIds.map(colId => {
    const index = columns.id.findIndex((_, i) => (columns.parentId[i] === tableRef && columns.colId[i] === colId));
    if (index === -1) {return null;}
    return Object.fromEntries(fields.map(f => [f, columns[f][index]]));
  });
}

// A promise that can be resolved or rejected from outside.
function defer() {
  let resolve = null;
  let reject = null;
  const prom = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  prom.resolve = resolve;
  prom.reject = reject;
  return prom;
}

function event() {
  const obj = (callback) => {
    obj._callback.push(callback);
    return () => obj._callback.splice(obj._callback.indexOf(callback), 1);
  };
  obj._callback = [];
  obj.trigger = async (...args) => {
    for (const callback of obj._callback) {
      await callback(...args);
    }
  }
  obj.click = dom.on('click', () => obj.trigger());
  return obj;
}


// A handler for Grist events, that can be removed.
function listen(event, handler) {
  let enabled = true;
  const myHandler = (...args) => enabled && handler(...args);
  grist[`on${event}`](myHandler);
  return () => enabled = false;
}

// Same handler, but it will be removed after the first call.
function once(event, handler) {
  const remove = listen(event, (...args) => {
    remove();
    handler(...args);
  });
  return remove;
}

function style(style) {
  return {style};
}

function buildRenderer() {
  const rendererElem = dom('div');
  rendererElem.wait = Formio.createForm(rendererElem, {}).then((r) => rendererElem.model = r);
  return rendererElem;
}

function buildBuilder() {
  const builderElem = dom('div.overflow');
  const form = observable(null);
  builderElem.form = form;
  builderElem.setForm = (val) => {
    form.set(val);
    builderElem.model.setForm(val);
  }
  Formio.builder(builderElem, {}, {noNewEdit: true})
    .then(builder => {
      builderElem.model = builder;
      builder.on('addComponent', () => form.set({...builder.form}));
      builder.on('removeComponent', () => form.set({...builder.form}));
      builder.on('updateComponent', () => form.set({...builder.form}));
    });
  return builderElem;
}


function div(className, ...args) {
  // className contains class names, and also styles. So we need to extract those styles, and pass
  // it as a separate argument.

  // Match all styles expressions in form of `height: 100px;` or `height: 100px; width: 100px;`
  // Extract them and remove them from className. Watch out there are normal classes as words, so be careful.
  const styles = className.match(/([a-z-]+:\s*[^;]+;)/g);
  className = className.replace(/([a-z-]+:\s*[^;]+;)/g, '');
  return dom('div' + '.' + className, {style: styles?.join('')}, ...args);
}

async function createNewForm() {
  const table = grist.getTable(grist.getSelectedTableIdSync());
  const {id} = await table.create({
    fields: {
      Name: 'Untitled',
    }
  });
  await grist.setCursorPos({rowId: id});
}

async function updateForm(id, form) {
  const table = grist.getTable(grist.getSelectedTableIdSync());
  await table.update({
    id,
    fields: {
      FormJson: form ? JSON.stringify(form) : null,
    }
  });
}