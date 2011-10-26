/**
 * Handles Comment meta data - the number of comments on a class and its members.
 * Also deals with keeping meta content up to date when comments are added or removed.
 */
Ext.define('Docs.controller.CommentsMeta', {
    extend: 'Ext.app.Controller',

    refs: [
        {
            ref: 'toolbar',
            selector: 'classoverview toolbar'
        },
        {
            ref: 'authentication',
            selector: 'authentication'
        },
        {
            ref: 'overview',
            selector: 'classoverview'
        }
    ],

    init: function() {
        Docs.commentMeta = {
            idMap: {},
            'class': {}
        };

        this.addEvents(
            /**
             * @event afterLoad  Fired after a meta data is loaded
             */
            'afterLoad'
        );

        this.getController('Auth').on({
            available: function() {
                this.fetchCommentMeta();
            },
            scope: this
        });

        this.getController('Comments').on({
            add: function(id) {
                this.updateClassCommentMeta(id, 1);
            },
            remove: function(id) {
                this.updateClassCommentMeta(id, -1);
            },
            scope: this
        });

        this.getController('Classes').on({
            showIndex: function() {
                this.updateClassIndex();
            },
            showClass: function(cls, opts) {
                if (opts.reRendered) {
                    this.createCommentIdMap(this.getController('Classes').currentCls);
                    this.renderClassCommentMeta(cls);
                }
            },
            scope: this
        });

        this.control({
            'hovermenu': {
                refresh : this.refreshHoverMenu
            }
        });
    },

    /**
     * Fetch all comment meta data and populate a local store
     */
    fetchCommentMeta: function() {
        Ext.data.JsonP.request({
            url: Docs.baseUrl + '/' + Docs.commentsDb + '/_design/Comments/_view/by_target',
            method: 'GET',
            params: {
                reduce: true,
                group_level: 3
            },
            success: function(response) {
                Ext.Array.each(response.rows, function(r) {
                    this.updateMeta(r.key, r.value.num);
                }, this);

                this.metaLoaded = true;
                this.fireEvent('afterLoad');
                this.updateClassIndex();
            },
            scope: this
        });
    },

    // updateVoteMeta: function() {
    //     var id = Docs.App.getController('Classes').currentCls.name,
    //         startkey = Ext.JSON.encode(['class',id]),
    //         endkey = Ext.JSON.encode(['class',id,{}]),
    //         currentUser = this.getController('Auth').currentUser;
    //
    //     if (!id) return;
    //
    //     Ext.data.JsonP.request({
    //         url: Docs.baseUrl + '/' + Docs.commentsDb + '/_design/Comments/_list/with_vote/by_target',
    //         method: 'GET',
    //         params: {
    //             reduce: false,
    //             startkey: startkey,
    //             endkey: endkey,
    //             user: currentUser && currentUser.userName,
    //             votes: true
    //         },
    //         success: function(response) {
    //             console.log(response.rows)
    //         },
    //         scope: this
    //     });
    // },

    fetchCommentLeaders: function() {
        Ext.data.JsonP.request({
            url: Docs.baseUrl + '/' + Docs.commentsDb + '/_design/Comments/_view/by_author',
            method: 'GET',
            params: {
                reduce: true,
                group_level: 1,
                descending: true,
                limit: 10
            },
            success: function(response) {
                var tpl = Ext.create('Ext.XTemplate',
                    '<h1>Comment reputation</h1>',
                    '<table>',
                    '<tpl for=".">',
                        '<tr><td>{value}</td><td>{key}</td></tr>',
                    '</tpl>',
                    '</table>'
                );

                tpl.append(Ext.get(Ext.query('#welcomeindex .news .l')[0]), response.rows);
            },
            scope: this
        });
    },

    /**
     * Called when a comment is added or removed. Updates the meta table, then refreshes the view
     */
    updateClassCommentMeta: function(id, delta) {
        var clsId = Docs.commentMeta.idMap[id];
        this.updateMeta(clsId, delta);
        Docs.view.Comments.updateClassCommentMeta(clsId[1]);
    },

    /**
     * Update comment count info
     * @param key Path to class / property
     * @param delta Difference to comment number
     */
    updateMeta: function(key, delta) {
        Docs.commentMeta[key[0]] = Docs.commentMeta[key[0]] || {};
        Docs.commentMeta[key[0]][key[1]] = Docs.commentMeta[key[0]][key[1]] || { total: 0 };
        Docs.commentMeta[key[0]][key[1]][key[2]] = Docs.commentMeta[key[0]][key[1]][key[2]] || 0;

        Docs.commentMeta[key[0]][key[1]][key[2]] += delta;
        Docs.commentMeta[key[0]][key[1]]['total'] += delta;
    },

    /**
     * Creates a mapping between comment element IDs and DB view keys.
     */
    createCommentIdMap: function(cls) {
        Docs.commentMeta.idMap[('comments-class-' + cls.name).replace(/\./g, '-')] = ['class', cls.name, ''];

        if (cls.members) {
            for (var member in cls.members) {
                Ext.Array.each(cls.members[member], function(memberItem) {
                    var origKey = ['class', cls.name, memberItem.id];
                    var key = ['class', memberItem.owner, memberItem.id];
                    var commentId = 'comments-' + origKey.join('-').replace(/\./g, '-');
                    Docs.commentMeta.idMap[commentId] = key;
                }, this);
            }
        }
    },

    refreshHoverMenu: function(cmp) {
        if (this.metaLoaded) {
            Docs.view.Comments.renderHoverMenuMeta(cmp.el);
        } else {
            this.addListener('afterLoad', function() {
                Docs.view.Comments.renderHoverMenuMeta(cmp.el);
            }, this, {
                single: true
            });
        }
    },

    updateClassIndex: function() {
        if (this.getController('Comments').commentsEnabled) {
            if (this.metaLoaded) {
                Docs.view.Comments.updateClassIndex();
            } else {
                this.addListener('afterLoad', function() {
                    Docs.view.Comments.updateClassIndex();
                }, this, {
                    single: true
                });
            }
        }
    },

    renderClassCommentMeta: function(cls) {
        if (this.metaLoaded) {
            Docs.view.Comments.updateClassCommentMeta(cls);
        } else {
            this.addListener('afterLoad', function() {
                Docs.view.Comments.updateClassCommentMeta(cls);
            }, this, {
                single: true
            });
        }
    }
});