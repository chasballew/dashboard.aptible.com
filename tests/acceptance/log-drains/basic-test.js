import Ember from 'ember';
import {module, test} from 'qunit';
import startApp from '../../helpers/start-app';
import { stubRequest } from '../../helpers/fake-server';

let App;

let stackHandle = 'my-stack-handle',
    stackId = 'my-stack-id',
    orgName = 'my org',
    orgId = '1',
    url = `stacks/${stackId}/logging`;

module('Acceptance: Log Drains', {
  beforeEach: function() {
    App = startApp();
    stubStacks();
    stubOrganization({id: orgId, name: orgName});
  },
  afterEach: function() {
    Ember.run(App, 'destroy');
  },
  prepareStubs: function(options, databasesPayload){
    let defaultLogDrains = [{
      id: 'drain-1',
      handle: 'first-drain',
      drain_host: 'abcdef.com',
      drain_port: 123,
      status: 'provisioning'
    }];
    options = options || {logDrains: defaultLogDrains};

    stubStack({
      id: stackId,
      handle: stackHandle,
      _embedded: { log_drains: options.logDrains },
      _links: {
        organization: { href: `/organizations/${orgId}`},
        databases: { href: `/accounts/${stackId}/databases` }
     }
    });

    stubRequest('get', 'log_drains/:id', function(request) {
      let matchedLogDrain = {};
      options.logDrains.forEach(function(logDrain, i){
        if (options.logDrains[i].id === request.params.id) {
          matchedLogDrain = options.logDrains[i];
        }
      });
      return this.success(matchedLogDrain);
    });

    databasesPayload = databasesPayload || [{id: 'db-1', type: 'elasticsearch'}];
    stubStackDatabases(stackId, databasesPayload);
  }
});

function openModal() {
  let openButton = findWithAssert('.open-log-drain-modal').eq(0);
  openButton.click();
}


test(`visit ${url} requires authentication`, function(){
  expectRequiresAuthentication(url);
});

test(`visit ${url} shows basic info`, function(assert){
  let logDrains = [{
    id: 'drain-1',
    handle: 'first-drain',
    drain_host: 'abcdef.com',
    drain_port: 123,
    status: 'provisioned'
  }, {
    id: 'drain-2',
    handle: 'second-drain',
    drain_host: 'second.com',
    drain_port: 456,
    status: 'pending'
  }, {
    id: 'drain-3',
    handle: 'second-drain',
    drain_host: 'second.com',
    drain_port: 456,
    status: 'deprovisioning'
  }];

  this.prepareStubs({logDrains});

  signInAndVisit(url);

  andThen(function(){
    assert.equal(currentPath(), 'requires-authorization.enclave.stack.log-drains.index');

    expectButton('Create Log Drain');

    let logDrainEls = find('.log-drain');
    assert.equal( logDrainEls.length, logDrains.length, 'shows all 3 log drains');

    logDrains.forEach(function(logDrain, i){
      let logDrainEl = find(`.log-drain:eq(${i})`);
      assert.ok( logDrainEl.text().indexOf( logDrain.drain_host ) > -1,
          'shows drain host');
      assert.ok( logDrainEl.text().indexOf( logDrain.drain_port ) > -1,
          'shows drain port');
      expectTitle(`${stackHandle} Log Drains`);
    });

    assert.ok(find('h5:contains(Provisioned Log Drains)').length, 'has a provisioned header');
    assert.equal(find('.provisioned-log-drains .log-drain').length, 1, 'has one provisioned log drain');

    assert.ok(find('h5:contains(Provisioning Log Drains)').length, 'has a pending header');
    assert.equal(find('.pending-log-drains .log-drain').length, 1, 'has one pending log drain');

    assert.ok(find('h5:contains(Deprovisioning Log Drains)').length, 'has a deprovisioning header');
    assert.equal(find('.deprovisioning-log-drains .log-drain').length, 1, 'has one deprovisioning log drain');
  });
});

test(`visit ${url} shows pending and provisioning`, function(assert){
  let logDrains = [{
    id: 'drain-1',
    handle: 'first-drain',
    drain_host: 'abcdef.com',
    drain_port: 123,
    status: 'pending'
  }, {
    id: 'drain-2',
    handle: 'second-drain',
    drain_host: 'second.com',
    drain_port: 456,
    status: 'provisioning'
  }];

  this.prepareStubs({logDrains});

  signInAndVisit(url);

  andThen(function(){
    assert.equal(currentPath(), 'requires-authorization.enclave.stack.log-drains.index');

    expectButton('Create Log Drain');

    let logDrainEls = find('.log-drain');
    assert.equal( logDrainEls.length, logDrains.length );

    assert.ok(find('h5:contains(Provisioning Log Drains)').length, 'has a pending header');
    assert.ok(find('h5:contains(Host)').length, 'has host section');
    assert.equal(find('.pending-log-drains .log-drain').length, 2, 'has one pending log drain');
  });
});

test(`visit ${url} shows log tail explanation`, function(assert) {
  let logDrains = [{
    id: 'drain-1',
    handle: 'first-drain',
    drain_type: 'tail',
    status: 'pending'
  }];

  this.prepareStubs({logDrains});

  signInAndVisit(url);

  andThen(function(){
    assert.equal(currentPath(), 'requires-authorization.enclave.stack.log-drains.index');
    assert.ok(!find('h5:contains(Host)').length, 'has no host section');
    assert.ok(find('h3:contains(log drain was automatically provisioned)').length, 'has tail explanation');
  });
});

test(`visit ${url} with no log drains will show message`, function(assert) {
  this.prepareStubs({logDrains:[]});
  signInAndVisit(url);

  andThen(function() {
     assert.equal(currentPath(), 'requires-authorization.enclave.stack.log-drains.index');
    assert.equal(find('.activate-notice:contains(has no log drains)').length, 1, 'shows notice of no apps');
    assert.equal(find('.open-log-drain-modal:contains(Create Log Drain)').length, 1, 'Shows create log drain button');
  });
});

test(`visit ${url} with log drains and click add log shows form`, function(assert){
  this.prepareStubs();
  signInAndVisit(url);

  andThen(openModal);

  andThen(function() {
    let formEl = find('form.create-log');
    assert.ok( formEl.length, 'has form');

    let context = formEl;
    expectInput('drain-host', {context});
    expectInput('drain-port', {context});
    expectInput('handle', {context});
    expectInput('drain-type', {context});
    expectFocusedInput('handle', {context});

    expectButton('Save Log Drain');
    expectButton('Cancel');
  });
});

test(`visit ${url} with log drains and restart one`, function(assert){
  let operationId = 1;
  let defaultLogDrains = { logDrains: [{
    id: 'drain-1',
    handle: 'first-drain',
    drain_host: 'abcdef.com',
    drain_port: 123,
    status: 'provisioned'
  }]};
  this.prepareStubs(defaultLogDrains);

  stubRequest('post', `/log_drains/:id/operations`, function(request){
    let json = this.json(request);
    assert.equal(json.type, 'configure', 'creates a configure operation');
    return this.success({
      id: '1',
      status: 'queued',
      type: 'configure'
    });
  });

  stubRequest('get', `/operations/${operationId}`, function(){
    return this.success({
      id: '1',
      status: 'succeeded',
      type: 'configure'
    });
  });

  stubRequest('put', `/log_drains/:id`, function(request){
    let drain = this.json(request);
    assert.equal(drain.status, 'provisioning', 'sets status to provisioning for polling');
    drain.id = request.params.id;
    return this.success(drain);
  });

  signInAndVisit(url);

  andThen(function(){
    clickButton('Restart');
  });
  andThen(function() {
    assert.equal(find('.alert-success').length, 1, 'displays a success message');
  });
});

test(`visit ${url} with log drains and deprovisions one`, function(assert){

  this.prepareStubs();
  let operationId = 1;

  stubRequest('post', `/log_drains/:id/operations`, function(request){
    let json = this.json(request);
    assert.equal(json.type, 'deprovision', 'creates a deprovision operation');
    return this.success({
      id: '1',
      status: 'queued',
      type: 'deprovision'
    });
  });

  stubRequest('get', `/operations/${operationId}`, function(){
    return this.success({
      id: '1',
      status: 'succeeded',
      type: 'deprovision'
    });
  });

  stubRequest('put', `/log_drains/:id`, function(request){
    let drain = this.json(request);
    assert.equal(drain.status, 'deprovisioning', 'sets status to deprovisioning');
    drain.id = request.params.id;
    return this.success(drain);
  });

  signInAndVisit(url);

  andThen(function(){
    // Clobber window confirm to accept delete.
    window.confirm = () => { return true; };
    clickButton('Delete');
  });
  andThen(function() {
    assert.equal(find('.alert-success').length, 1, 'displays a success message');
    assert.equal(currentPath(), 'requires-authorization.enclave.stack.log-drains.index',
      'should first redirect to index page');
  });
});

test(`visit ${url} and cancel`, function(assert){
  this.prepareStubs();
  signInAndVisit(url);
  andThen(openModal);
  andThen(function(){
    clickButton('Cancel');
  });

  andThen(function(){
    assert.equal(currentPath(), 'requires-authorization.enclave.stack.log-drains.index');
  });
});

test(`visit ${url} and create log success`, function(assert){
  assert.expect(8);

  this.prepareStubs();

  var drainHost = 'abc-host.com',
      drainPort = '1234',
      handle = 'my-log-name',
      drainType = 'syslog_tls_tcp',
      logDrainId = 'log-id-1';

  stubRequest('post', '/accounts/:stack_id/log_drains', function(request){
    assert.ok(true, 'posts to log_drains');

    let json = this.json(request);
    assert.equal(json.drain_host, drainHost);
    assert.equal(json.drain_port, drainPort);
    assert.equal(json.drain_type, drainType);
    assert.equal(json.handle, handle);

    json.id = logDrainId;
    json.status='provisioning';
    return this.success(json);
  });

  stubRequest('get', `/log_drains/${logDrainId}`, function(){
    assert.ok(true, 'polls for updates');
    return this.success({
      id: logDrainId,
      handle: handle,
      drain_host: drainHost,
      drain_port: drainPort
    });
  });

  stubRequest('post', `/log_drains/${logDrainId}/operations`, function(request){
    let json = this.json(request);
    assert.equal(json.type, 'configure', 'creates configure operation');
    return this.success();
  });

  signInAndVisit(url);
  andThen(openModal);
  andThen(function(){
    let formEl = find('form.create-log');
    let context = formEl;

    fillInput('drain-host', drainHost, {context});
    fillInput('drain-port', drainPort, {context});
    fillInput('handle', handle, {context});
    clickButton('Save Log Drain', {context});
  });

  andThen(function(){
    assert.equal(currentPath(), 'requires-authorization.enclave.stack.log-drains.index');
  });
});

test(`visit ${url} without elasticsearch databases`, function(assert){
  this.prepareStubs(null, []);

  signInAndVisit(url);
  andThen(openModal);
  andThen(function(){
    click( find('label:contains(Elasticsearch)')); // click elasticsearch radio button
  });

  andThen(function() {
    let saveButton = find('button:contains(Save Log Drain)');

    assert.ok(find('.no-es-databases-warning').length, 'shows warning');
    assert.ok(saveButton.is(':disabled'), 'save button is disabled');
  });
});

test(`visit ${url} and create log to elasticsearch`, function(assert){
  assert.expect(8);

  let drainUser = 'someUser',
      drainPassword = 'somePw',
      drainHost = 'abc-host.com',
      drainPort = '1234',
      drainType = 'elasticsearch',
      logDrainId = 'log-drain-foo',
      databaseHandle = 'databaseHandle';

  let databasesPayload = [
    {
      id: 'db-1',
      type: 'elasticsearch',
      handle: 'do-not-pick-me',
      connection_url: `http:\/\/user:password@foo-bar.com:4567`
    }, {
      id: 'db-2',
      type: 'elasticsearch',
      handle: databaseHandle,
      connection_url: `http:\/\/${drainUser}:${drainPassword}@${drainHost}:${drainPort}`
    }
  ];
  this.prepareStubs(null, databasesPayload);

  stubRequest('post', '/accounts/:stack_id/log_drains', function(request){
    assert.ok(true, 'posts to log_drains');

    let json = this.json(request);

    assert.equal(json.drain_host, drainHost);
    assert.equal(json.drain_port, drainPort);
    assert.equal(json.drain_type, drainType);
    assert.equal(json.drain_password, drainPassword);
    assert.equal(json.drain_username, drainUser);

    json.id = logDrainId;
    json.status = 'provisioning';
    return this.success(json);
  });

  stubRequest('post', `/log_drains/${logDrainId}/operations`, function(){
    return this.success();
  });

  stubRequest('get', `/log_drains/${logDrainId}`, function(){
    assert.ok(true, 'polls for updates');

    return this.success({
      id: logDrainId,
      status: 'provisioned',
      drainHost: drainHost,
      drainPort: drainPort,
      handle: logDrainId,
      drainType: drainType,
      databaseHandle: databaseHandle
    });
  });

  signInAndVisit(url);
  andThen(openModal);
  andThen(function(){
    let formEl = find('form.create-log');
    let context = formEl;

    click( find('label:contains(Elasticsearch)')); // click elasticsearch radio button
    fillInput('handle', 'handle', { context });
    fillInput('database-selector', 'db-2');
    clickButton('Save Log', {context});
  });

  andThen(function(){
    assert.equal(currentPath(), 'requires-authorization.enclave.stack.log-drains.index');
  });
});

test(`visit ${url} and create log to HTTPS`, function(assert){
  assert.expect(7);

  this.prepareStubs();

  let drainHost = 'abc-host.com',
      drainPort = '443',
      drainType = 'https',
      handle    = 'https-test',
      logDrainId = 'log-drain-bar';

  stubRequest('post', '/accounts/:stack_id/log_drains', function(request){
    assert.ok(true, 'posts to log_drains');

    let json = this.json(request);
    assert.equal(json.drain_host, drainHost);
    assert.equal(json.drain_port, drainPort);
    assert.equal(json.drain_type, drainType);
    assert.equal(json.handle, handle);

    json.id = logDrainId;
    return this.success(json);
  });

  stubRequest('get', '/log_drains/:id', function(request){
    return this.success({
      id: request.params.id,
      handle: handle,
      drain_host: drainHost,
      drain_port: drainPort
    });
  });

  stubRequest('post', `/log_drains/${logDrainId}/operations`, function(request){
    let json = this.json(request);
    assert.equal(json.type, 'configure', 'creates configure operation');
    return this.success();
  });

  signInAndVisit(url);
  andThen(openModal);
  andThen(function(){
    let formEl = find('form.create-log');
    let context = formEl;

    click( find('label:contains(HTTPS)')); // click HTTPS radio button
    fillInput('drain-host', drainHost, {context});  // Port should default to 443
    fillInput('handle', handle, {context});
    clickButton('Save Log Drain', {context});
  });

  andThen(function(){
    assert.equal(currentPath(), 'requires-authorization.enclave.stack.log-drains.index');
  });
});

test(`visit ${url} and create log failure`, function(assert){
  this.prepareStubs();
  let errorMessage = 'The log drain is invalid';

  stubRequest('post', '/accounts/:stack_id/log_drains', function(){
    assert.ok(true, 'posts to log_drains');

    return this.error({ message: errorMessage });
  });

  signInAndVisit(url);
  andThen(openModal);
  andThen(function(){
    let formEl = find('form.create-log');
    clickButton('Save Log', {context:formEl});
  });
  andThen(function(){
    assert.equal(currentPath(), 'requires-authorization.enclave.stack.log-drains.index');
    let errorDiv = find('.alert');
    assert.ok( errorDiv.length, 'error div is shown');
    assert.ok( errorDiv.text().indexOf(errorMessage) > -1,
        'error message is displayed');
  });
});

test(`visit ${url} when unverified disables create button`, function(assert) {
  this.prepareStubs();
  let userData = {verified: false};
  signInAndVisit(url, userData);
  andThen( () => {
    let createButton = findWithAssert('.btn:contains(Create Log Drain)');
    assert.ok(createButton.attr('disabled'), 'button is disabled');
  });
});
