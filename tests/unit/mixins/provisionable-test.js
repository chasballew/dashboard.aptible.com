import Ember from 'ember';
import { module, test, skip } from 'qunit';
import {
  ProvisionableBaseMixin
} from '../../../mixins/models/provisionable';
import STATUSES from '../../../mixins/models/statuses';

// minimum setTimeout resolution is 10 ms
const TEST_RELOAD_RETRY_DELAY = 10;

const FakeModel = Ember.Object.extend(ProvisionableBaseMixin, {
  _reloadRetryDelay: TEST_RELOAD_RETRY_DELAY,
  reload() {
    return Ember.RSVP.resolve();
  }
});

module('mixin:provisionable', {
});


test('will not reload when status is not STATUSES.PROVISIONING', function(assert) {
  assert.expect(1);

  let model = FakeModel.create({
    status: STATUSES.PROVISIONED,
    reloadOn: [STATUSES.PROVISIONING]
  });

  assert.equal(model._shouldReload(), false);
});

test('will not reload when reloadOn is empty', function(assert) {
  assert.expect(1);

  let model = FakeModel.create({
    status: STATUSES.PROVISIONING,
    reloadOn: []
  });

  assert.equal(model._shouldReload(), false);
});

test('will reload when STATUS.PROVISIONING and reloadOn is set to STATUS.PROVISIONING', function(assert) {
  assert.expect(1);

  let model = FakeModel.create({
    status: STATUSES.PROVISIONING,
    reloadOn: [STATUSES.PROVISIONING]
  });

  assert.equal(model._shouldReload(), true);
});

skip('recursively calls reload while STATUSES.PROVISIONING', function(assert) {
  // TODO:
  // This test is really flakey on phantom JS 2.1.  Need to debug and fix
  assert.expect(2);
  let done = assert.async();

  let model = FakeModel.create({
    status: STATUSES.PROVISIONING,
    reloadOn: [STATUSES.PROVISIONING],
    count: 0,

    reload() {
      if (this.count > 5) {
        this.set('status', STATUSES.PROVISIONED);
        assert.ok(true, 'called reload correct number of times');
      }

      this.count++;

      return Ember.RSVP.resolve();
    }
  });

  Ember.run.later(function() {
    assert.ok(!model.get('isProvisioning'), 'model is no longer provisioning');

    done();
  }, TEST_RELOAD_RETRY_DELAY*10);
});
