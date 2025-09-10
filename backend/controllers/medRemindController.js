const MedReminds = require('../models/MedRemind');

const MedRemindsController = {
  async getAll(req, res) {
    try {
      const userId = req.user.id;
      console.log('[GET] /medReminds for user', userId);
      const meds = await MedReminds.getAll(userId);
      res.json(meds);
    } catch (err) {
      console.error('[ERROR][GET] /medReminds:', err);
      res.status(500).json({ error: err.message });
    }
  },
  async getById(req, res) {
    try {
      const userId = req.user.id;
      console.log(`[GET] /medReminds/${req.params.id} for user`, userId);
      const med = await MedReminds.getById(req.params.id, userId);
      if (!med) return res.status(404).json({ error: 'Not found' });
      res.json(med);
    } catch (err) {
      console.error(`[ERROR][GET] /medReminds/${req.params.id}:`, err);
      res.status(500).json({ error: err.message });
    }
  },
  async create(req, res) {
    try {
      const userId = req.user.id;
      console.log('[POST] /medReminds', req.body, 'for user', userId);
      await MedReminds.create(req.body, userId);
      res.status(201).json({ message: 'Created' });
    } catch (err) {
      console.error('[ERROR][POST] /medReminds:', err);
      res.status(500).json({ error: err.message });
    }
  },
  async update(req, res) {
    try {
      const userId = req.user.id;
      console.log(`[PUT] /medReminds/${req.params.id}`, req.body, 'for user', userId);
      await MedReminds.update(req.params.id, req.body, userId);
      res.json({ message: 'Updated' });
    } catch (err) {
      console.error(`[ERROR][PUT] /medReminds/${req.params.id}:`, err);
      res.status(500).json({ error: err.message });
    }
  },
  async delete(req, res) {
    try {
      const userId = req.user.id;
      console.log(`[DELETE] /medReminds/${req.params.id} for user`, userId);
      await MedReminds.delete(req.params.id, userId);
      res.json({ message: 'Deleted' });
    } catch (err) {
      console.error(`[ERROR][DELETE] /medReminds/${req.params.id}:`, err);
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = MedRemindsController; 