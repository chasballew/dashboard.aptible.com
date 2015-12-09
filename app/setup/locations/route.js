import Ember from 'ember';
import Schema from 'ember-json-schema/models/schema';
import Property from 'ember-json-schema/models/property';
import locationsSchema from 'sheriff/schemas/locations';
import SPDRouteMixin from 'sheriff/mixins/routes/spd-route';
import Attestation from 'sheriff/models/attestation';

// Use schema as property for validation
export var locationProperty = new Property(locationsSchema.items);

export default Ember.Route.extend(SPDRouteMixin, {
  model() {
    let schema = new Schema(locationsSchema);
    let organization = this.modelFor('organization');
    let store = this.store;
    let attestation = Attestation.findOrCreate('locations', organization, [], store);

    return Ember.RSVP.hash({ schema, attestation,
                             schemaDocument: schema.buildDocument() });
  },

  setupController(controller, model) {
    let { schemaDocument, schema } = model;

    schemaDocument.load(model.attestation.get('document'));

    controller.set('schema', schema);
    controller.set('document', schemaDocument);
  },

  actions: {
    onNext() {
      let { schemaDocument, attestation } = this.currentModel;
      let profile = this.modelFor('setup');

      attestation.set('document', schemaDocument);
      attestation.save().then(() => {
        profile.next(this.get('stepName'));
        profile.save().then(() => {
          this.transitionTo(`setup.${profile.get('currentStep')}`);
        });
      });
    },

    onAddLocation() {
      let newLocation = this.controller.get('document').addItem();
      this.controller.setProperties({ newLocation });
    }
  }
});