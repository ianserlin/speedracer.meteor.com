Meteor.publish('races', function(){
	return Races.find({});
});

Races.allow({
  insert: function (userId, doc) {
    // the user must be logged in, and the document must be owned by the user
    return (userId && doc.owner === userId);
  },
  update: function (userId, docs, fields, modifier) {
    // can only change your own documents
    return _.all(docs, function(doc) {
      return doc.owner === userId;
    });
  },
  remove: function (userId, docs) {
  	return true;
    // can only remove your own documents
    return _.all(docs, function(doc) {
      return doc.owner === userId;
    });
  },
  fetch: ['owner']
});

Races.deny({
  update: function (userId, docs, fields, modifier) {
    // can't change owners
    return _.contains(fields, 'owner');
  },
  remove: function (userId, docs) {
    // can't remove locked documents
    return _.any(docs, function (doc) {
      return doc.locked;
    });
  },
  fetch: ['locked'] // no need to fetch 'owner'
});

Meteor.users.deny({
  update: function() { return true; }
  , remove: function(){ return true; }
});