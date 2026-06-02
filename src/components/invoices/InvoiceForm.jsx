import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

const InvoiceForm = ({ invoice, setInvoice }) => {
  const handleChange = (field, value) => {
    setInvoice((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...invoice.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setInvoice((prev) => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setInvoice((prev) => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, rate: 0 }]
    }));
  };

  const removeItem = (index) => {
    const newItems = invoice.items.filter((_, i) => i !== index);
    setInvoice((prev) => ({ ...prev, items: newItems }));
  };

  return (
    <div className="space-y-6 bg-white/5 border border-white/10 rounded-xl p-4 md:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Invoice Number</label>
          <input
            type="text"
            value={invoice.invoiceNumber || ''}
            onChange={(e) => handleChange('invoiceNumber', e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
            placeholder="INV-001"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Date</label>
          <input
            type="date"
            value={invoice.date || ''}
            onChange={(e) => handleChange('date', e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-white border-b border-white/10 pb-2">Client Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Client Name</label>
            <input
              type="text"
              value={invoice.clientName || ''}
              onChange={(e) => handleChange('clientName', e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
              placeholder="Client Name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Client Email</label>
            <input
              type="email"
              value={invoice.clientEmail || ''}
              onChange={(e) => handleChange('clientEmail', e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
              placeholder="client@example.com"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-text-muted mb-1">Client Address</label>
            <textarea
              value={invoice.clientAddress || ''}
              onChange={(e) => handleChange('clientAddress', e.target.value)}
              rows="2"
              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent resize-none"
              placeholder="123 Street Name, City, Country"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-white/10 pb-2">
          <h3 className="text-sm font-semibold text-white">Line Items</h3>
          <button onClick={addItem} className="text-xs flex items-center gap-1 text-accent hover:text-white transition-colors">
            <Plus size={14} /> Add Item
          </button>
        </div>
        
        {(invoice.items || []).map((item, index) => (
          <div key={index} className="flex flex-col sm:flex-row gap-2 sm:items-start bg-black/20 sm:bg-transparent p-3 sm:p-0 rounded-lg sm:rounded-none border border-white/5 sm:border-none">
            <div className="w-full sm:flex-1">
              <input
                type="text"
                value={item.description}
                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
                placeholder="Item description"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto items-center">
              <div className="flex-1 sm:w-20">
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
                  placeholder="Qty"
                  min="1"
                />
              </div>
              <div className="flex-1 sm:w-24">
                <input
                  type="number"
                  value={item.rate}
                  onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value))}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
                  placeholder="Rate"
                  min="0"
                  step="0.01"
                />
              </div>
              <button
                onClick={() => removeItem(index)}
                className="p-2.5 text-text-muted hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors flex-shrink-0 sm:mt-0.5"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/10 pt-4">
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Discount (₹)</label>
          <input
            type="number"
            value={invoice.discount || 0}
            onChange={(e) => handleChange('discount', parseFloat(e.target.value))}
            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
            min="0"
            step="0.01"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Tax Rate (%)</label>
          <input
            type="number"
            value={invoice.taxRate || 0}
            onChange={(e) => handleChange('taxRate', parseFloat(e.target.value))}
            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
            min="0"
            max="100"
            step="0.1"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-text-muted mb-1">Notes</label>
          <textarea
            value={invoice.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows="2"
            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent resize-none"
            placeholder="Thank you for your business!"
          />
        </div>
      </div>
    </div>
  );
};

export default InvoiceForm;
