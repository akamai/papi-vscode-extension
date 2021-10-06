const vscode = acquireVsCodeApi();


$( document ).ready(function() {
  init();
  vscode.postMessage({command: 'documentReady'});
});

function init() {
    document.getElementById('loader').hidden = true;
}

// receive message from extension
window.addEventListener('message', event => {
  const message = event.data;
    switch (message.command) {
      case 'configureEdgerc':
          configureEdgerc(true);
        break;
      case 'edgercConfigured':
          configureEdgerc(false);
        break;
      case 'acceptSectionName':
        setEdgercSections(message);
        break;
      case 'acceptPropertyVersion':
        document.getElementById('propertyVersion').disabled = false;
        setPropertyVersions(message);
        break;
      case 'propertyNotFound':
        propertyNotFound();
        break;
      case 'searchError':
        searchError();

      // make sure the message is sent after edgercConfigured to get productId from papi
      case 'setRulesFiles':
        setRulesFiles(message);
        break;
      case 'settingUpProviders':
        break;
    }
  });

window.addEventListener('load',function(){

  document.getElementById('configureEdgerc')
  .addEventListener('click', configureEdgerc, true);

  document.getElementById('downloadLink')
  .addEventListener('click', configureDownload);

  document.getElementById('useLocalink')
  .addEventListener('click', configureUseLocal);

  document.getElementById('edgercFile')
  .addEventListener('input', sendEdgerc);

  document.getElementById('button0')
    .addEventListener('click', sendSection);

  document.getElementById('propertyName')
    .addEventListener('focus', focusSearchButton);
  
  document.getElementById('propertyName')
    .addEventListener('blur', outOfFocusSearchButton);

  document.getElementById('propertyName')
    .addEventListener('input', changeToSearchButton);

  document.getElementById('search')
    .addEventListener('focus', focusSearchButton);

    document.getElementById('search')
    .addEventListener('blur', outOfFocusSearchButton);

  document.getElementById('search')
    .addEventListener('click', searchProperty);

  document.getElementById('propertyVersion')
    .addEventListener('change', () => {document.getElementById('button1').disabled = false;});

  document.getElementById('button1')
    .addEventListener('click', getRules);

  document.getElementById('button2')
    .addEventListener('click', userLocalRules);

  document.getElementById('button3')
    .addEventListener('click', validateWithServer);

  document.getElementById('groupId')
    .addEventListener('click', setContracts);
});

function configureEdgerc(flag) {
  document.getElementById('configureEdgerc').hidden = flag;
  document.getElementById('edgercDiv').hidden = !flag;
  document.getElementById('externalFormsDiv').hidden = flag;
  document.getElementById('useLocalDiv').hidden = flag;
  document.getElementById('externalLinksDiv').hidden = flag;
  document.getElementById('downloadDiv').hidden = true;
  document.getElementById('useLocalDiv').hidden = true;
}

function configureDownload() {
  configureEdgerc(false);
  document.getElementById('downloadDiv').hidden = false;
  document.getElementById('useLocalDiv').hidden = true;
}

function configureUseLocal() {
  configureEdgerc(false);
  document.getElementById('useLocalDiv').hidden = false;
  document.getElementById('downloadDiv').hidden = true;
}

// reading edgerc file
function sendEdgerc(event) {
  const input = event.target;
  if ('files' in input && input.files.length > 0) {
    readFileContent(input.files[0]).then(edgerc => {
      vscode.postMessage({
        command: 'postEdgerc',
        edgerc: edgerc});
    }).catch(error => console.log(error));
  }
}

var edgercList;
function setEdgercSections(message) {
  let sectionSelection = document.getElementById('section');
  let sectionNames = message.sectionNames;
  edgercList = message.edgercList;
  if(sectionNames && sectionNames.length > 0) {
    sectionSelection.disabled = false;
  } else {
    sectionSelection.disabled = true;
    return;
  }
  for (let i=0; i < sectionSelection.length; i++) {
    if(sectionSelection[i] === '-- choose a section --') {
      continue;
    }
    sectionSelection.remove(i);
  }
  for(let i = 0; i < sectionNames.length; i++) {
    let option = document.createElement('option');
    option.value = sectionNames[i];
    option.innerHTML = sectionNames[i];
    sectionSelection.add(option);
  }
  document.getElementById('button0').disabled = false;
}

// send section to initialize papi connection
function sendSection(event) {
  let edgercForm = formToJSON(document.getElementById('edgercForm'));
  let section = edgercList[edgercForm.section];
  let accountSwitchKey = '';
  if(edgercForm.accountSwitchKey) {
    accountSwitchKey = edgercForm.accountSwitchKey;
  }
  vscode.postMessage( {
    command: 'postEdgercSection',
    edgercSection: section,
    accountSwitchKey: accountSwitchKey
  });
}

var fileDetails;
function setRulesFiles(message) {
  document.getElementById('filePath').defaultValue = message.fileDetails.filePath? message.fileDetails.filePath : '';
  document.getElementById('propertyName').defaultValue = message.fileDetails.propertyName? message.fileDetails.propertyName : '';
  document.getElementById('propertyName1').defaultValue = message.fileDetails.propertyName? message.fileDetails.propertyName : '';
  fileDetails = message.fileDetails;
}

function focusSearchButton() {
  const sElement = document.getElementById('search');
  sElement.setAttribute('style', 'border: 1px solid var(--orange);');
  const pElement = document.getElementById('propertyName');
  pElement.setAttribute('style', 'border: 1px solid var(--orange);' +
  'outline: 1px solid var(--orange);');
}

function outOfFocusSearchButton() {
  const ele = document.getElementById('search');
  ele.setAttribute('style', 'border: 1px solid var(--white);' + 
  'border-left: transparent;');
  const pElement = document.getElementById('propertyName');
  pElement.setAttribute('style', 'border: 1px solid var(--white);');
}

function searchProperty() {
  const searchChild = document.getElementById('search-item');
  const parentNode = searchChild.parentNode;
  const loadChild = document.createElement('div');
  loadChild.setAttribute("id", "search-load");
  parentNode.setAttribute('style', 'padding-top: 5px;');
  parentNode.replaceChild(loadChild, searchChild);
  parentNode.disabled = true;
  document.getElementById('propertyName').disabled = true;

  let propertyName = document.getElementById("propertyName");
  if(propertyName.value === undefined){
    return;
  }
  vscode.postMessage({
    command: 'searchProperty',
    propertyName: propertyName.value
  })
}

var propertyId;
function setPropertyVersions(message) {
  const loadChild = document.getElementById('search-load');
  const parentNode = loadChild.parentNode;
  const tickChild = document.createElement('img');
  const article = document.querySelector('#tickUri');
  tickChild.src = article.dataset.uri;
  tickChild.setAttribute("id", "search-tick");
  parentNode.setAttribute('style', 'padding-top: 3px;');
  parentNode.replaceChild(tickChild, loadChild);
  parentNode.disabled = false;
  document.getElementById('propertyName').disabled = false;
  let versionSelection = document.getElementById('propertyVersion');
  if(message.latestVersion && message.latestVersion > 0) {
    propertyId = message.propertyId;
    versionSelection.disabled = false;
  } else {
    versionSelection.disabled = true;
    return;
  }
  for (let i = 0; i < versionSelection.length; i++) {
    if(versionSelection.options[i].value == '-- select a version --') {
      continue;
    }
    versionSelection.remove(i);
  }
  for(let i = message.latestVersion; i >= 1; i--) {
    let option = document.createElement('option');
    option.value = i;
    option.innerHTML = i;
    for(let j = 0; j < message.versions.length; j++) {
      if (i === message.versions[j].propertyVersion) {
        option.innerHTML = '' + i + ' - Production: ' + message.versions[j].productionStatus + ', Staging: ' + message.versions[j].stagingStatus
      }
    }
    versionSelection.add(option);
  }
}

function propertyNotFound() {
  const loadChild = document.getElementById('search-load');
  const parentNode = loadChild.parentNode;
  const crossChild = document.createElement('img');
  const article = document.querySelector('#crossUri');
  crossChild.src = article.dataset.uri;
  crossChild.setAttribute("id", "search-cross");
  parentNode.setAttribute('style', 'padding-top: 3px;');
  parentNode.replaceChild(crossChild, loadChild);
  parentNode.disabled = false;
  document.getElementById('propertyName').disabled = false;
}

function searchError() {
  const loadChild = document.getElementById('search-load');
  const parentNode = loadChild.parentNode;
  const crossChild = document.createElement('img');
  const article = document.querySelector('#searchUri');
  crossChild.src = article.dataset.uri;
  crossChild.setAttribute("id", "search-item");
  parentNode.setAttribute('style', 'padding-top: 3px;');
  parentNode.replaceChild(crossChild, loadChild);
  parentNode.disabled = false;
  document.getElementById('propertyName').disabled = false;
}

function changeToSearchButton() {
  const parentNode = document.getElementById('search');
  const searchChild = document.createElement('img');
  const article = document.querySelector('#searchUri');
  searchChild.src = article.dataset.uri;
  searchChild.setAttribute("id", "search-item");
  parentNode.setAttribute('style', 'padding-top: 3px;');
  const tickChild = document.getElementById('search-tick');
  const crossChild = document.getElementById('search-cross');
  try {
    parentNode.replaceChild(searchChild, tickChild);
  } catch(error) {

  }
  try {
    parentNode.replaceChild(searchChild, crossChild);
  } catch(error) {
    
  }
}

function getRules() {
  let form1 = formToJSON(document.forms[1]);
  if(form1.propertyName != null && form1.propertyVersion != null) {
    vscode.postMessage({
      command: 'downloadRules',
      propertyVersion: form1.propertyVersion,
      propertyId: propertyId
    });
    runLoader();
  }
}

function userLocalRules() {
  let form2 = formToJSON(document.forms[2]);
  if(form2.filePath != null && form2.propertyName1 != null) {
    vscode.postMessage({
      command: 'userLocalRules',
      fileInfo: fileDetails
    });
    runLoader();
  }
}

function validateWithServer() {
  let form2 = formToJSON(document.forms[2]);
  if(form2.filePath != null && form2.propertyName1 != null) {
    vscode.postMessage({
      command: 'validateWithServer',
    })
    runLoader();
  }
}

function formToJSON(elements) {
  return [].reduce.call(elements, (data, element) => {
    if(element.value && element.name) {
      data[element.name] = element.value;
    }
    return data;
  }, {});
}

async function readFileContent(file) {
  const reader = new FileReader()
  return new Promise((resolve, reject) => {
    reader.onload = event => resolve(event.target.result)
    reader.onerror = error => reject(error)
    reader.readAsText(file)
  })
}

function runLoader() {
  document.getElementById('allFormsDiv').hidden = true;
  document.forms[2].hidden = true;
  let loader = document.getElementById('loader');
  loader.style.display = 'block';
}