import React from 'react';

const InvoiceTemplate = ({ invoice }) => {
  if (!invoice) return null;

  return (
    <div className="bg-white text-black p-8 max-w-4xl mx-auto min-h-[1056px] print:p-0 print:min-h-0 relative shadow-sm" id="invoice-printable-area">
      {/* Header */}
      <div className="flex justify-between items-start mb-12">
        <div className="flex items-center gap-4">
          <img src="/menuwo-logo.png" alt="Menuwo Logo" className="w-40 h-auto" />
        </div>
        <div className="text-right">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight uppercase mb-2">Invoice</h1>
          <p className="text-gray-500 font-medium">#{invoice.invoiceNumber || 'INV-000'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-12">
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">From</h3>
          <p className="font-bold text-gray-900 text-lg">Menuwo</p>
          <p className="text-gray-600 mt-1">contact@menuwo.com</p>
          <p className="text-gray-600">www.menuwo.com</p>
        </div>
        <div className="text-right">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Bill To</h3>
          <p className="font-bold text-gray-900 text-lg">{invoice.clientName || 'Client Name'}</p>
          {invoice.clientEmail && <p className="text-gray-600 mt-1">{invoice.clientEmail}</p>}
          {invoice.clientAddress && <p className="text-gray-600 whitespace-pre-wrap mt-1">{invoice.clientAddress}</p>}
        </div>
      </div>

      <div className="flex justify-between border-y border-gray-200 py-4 mb-8">
        <div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Date</p>
          <p className="font-medium text-gray-900">{invoice.date || new Date().toLocaleDateString()}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Due Date</p>
          <p className="font-medium text-gray-900">{invoice.dueDate || 'Upon Receipt'}</p>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full mb-8">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-3 text-left text-sm font-bold text-gray-400 uppercase tracking-wider">Description</th>
            <th className="py-3 text-right text-sm font-bold text-gray-400 uppercase tracking-wider">Qty</th>
            <th className="py-3 text-right text-sm font-bold text-gray-400 uppercase tracking-wider">Rate</th>
            <th className="py-3 text-right text-sm font-bold text-gray-400 uppercase tracking-wider">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {invoice.items && invoice.items.length > 0 ? (
            invoice.items.map((item, index) => (
              <tr key={index}>
                <td className="py-4 text-gray-900">{item.description || 'Item description'}</td>
                <td className="py-4 text-right text-gray-600">{item.quantity || 1}</td>
                <td className="py-4 text-right text-gray-600">${parseFloat(item.rate || 0).toFixed(2)}</td>
                <td className="py-4 text-right font-medium text-gray-900">${(parseFloat(item.quantity || 1) * parseFloat(item.rate || 0)).toFixed(2)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="py-4 text-gray-400 italic text-center">No items added yet.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div className="w-1/2 ml-auto">
        <div className="flex justify-between py-2 text-gray-600">
          <span>Subtotal</span>
          <span>${parseFloat(invoice.subtotal || 0).toFixed(2)}</span>
        </div>
        {parseFloat(invoice.discount || 0) > 0 && (
          <div className="flex justify-between py-2 text-gray-600">
            <span>Discount</span>
            <span>-${parseFloat(invoice.discount || 0).toFixed(2)}</span>
          </div>
        )}
        {parseFloat(invoice.taxRate || 0) > 0 && (
          <div className="flex justify-between py-2 text-gray-600">
            <span>Tax ({invoice.taxRate}%)</span>
            <span>${((parseFloat(invoice.subtotal || 0) - parseFloat(invoice.discount || 0)) * (parseFloat(invoice.taxRate || 0) / 100)).toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between py-4 border-t border-gray-200 mt-2">
          <span className="font-bold text-gray-900 text-lg uppercase tracking-wide">Total</span>
          <span className="font-bold text-gray-900 text-lg">${parseFloat(invoice.total || 0).toFixed(2)}</span>
        </div>
      </div>

      {/* Footer Notes */}
      {invoice.notes && (
        <div className="mt-16 pt-8 border-t border-gray-100">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Notes</h3>
          <p className="text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}

      {/* Brand Footer */}
      <div className="absolute bottom-8 left-8 right-8 text-center text-gray-400 text-sm border-t border-gray-100 pt-8 print:hidden">
        Thank you for your business!
      </div>
    </div>
  );
};

export default InvoiceTemplate;
