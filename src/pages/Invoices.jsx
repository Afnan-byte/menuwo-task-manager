import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Printer, Save, FileText, ChevronLeft, Trash2, Download, Eye, Edit2 } from 'lucide-react';
import useInvoiceStore from '../store/invoiceStore';
import InvoiceForm from '../components/invoices/InvoiceForm';
import InvoiceTemplate from '../components/invoices/InvoiceTemplate';
import html2pdf from 'html2pdf.js';

export default function Invoices() {
  const { invoices, addInvoice, updateInvoice, deleteInvoice } = useInvoiceStore();
  const [view, setView] = useState('list'); // 'list', 'edit'
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [mobileTab, setMobileTab] = useState('form'); // 'form', 'preview' — mobile only

  const defaultInvoice = {
    invoiceNumber: `INV-${String((invoices || []).length + 1).padStart(3, '0')}`,
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    clientName: '',
    clientEmail: '',
    clientAddress: '',
    items: [{ description: '', quantity: 1, rate: 0 }],
    discount: 0,
    taxRate: 0,
    notes: 'Thank you for your business!',
    status: 'draft'
  };

  // Calculate totals dynamically
  const calculatedInvoice = useMemo(() => {
    if (!currentInvoice) return null;
    const subtotal = (currentInvoice.items || []).reduce((sum, item) => sum + (parseFloat(item.quantity || 0) * parseFloat(item.rate || 0)), 0);
    const discount = parseFloat(currentInvoice.discount || 0);
    const taxableAmount = subtotal - discount;
    const tax = taxableAmount * (parseFloat(currentInvoice.taxRate || 0) / 100);
    const total = taxableAmount + tax;

    return {
      ...currentInvoice,
      subtotal,
      total
    };
  }, [currentInvoice]);

  const handleCreateNew = () => {
    setCurrentInvoice(defaultInvoice);
    setMobileTab('form');
    setView('edit');
  };

  const handleEdit = (invoice) => {
    setCurrentInvoice(invoice);
    setMobileTab('form');
    setView('edit');
  };

  const handleSave = () => {
    if (calculatedInvoice.id) {
      updateInvoice(calculatedInvoice.id, calculatedInvoice);
    } else {
      addInvoice(calculatedInvoice);
    }
    setView('list');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('invoice-printable-area');
    if (!element) return;
    const filename = `${calculatedInvoice?.invoiceNumber || 'invoice'}.pdf`;
    const opt = {
      margin: 0.3,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  if (view === 'edit' && calculatedInvoice) {
    return (
      <div className="flex flex-col lg:flex-row h-full">
        {/* Editor Panel */}
        <div className={`w-full lg:w-[450px] flex-shrink-0 border-b lg:border-b-0 lg:border-r border-white/5 bg-black/20 flex flex-col print:hidden overflow-y-auto custom-scrollbar ${mobileTab === 'preview' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 md:p-6 border-b border-white/5 sticky top-0 bg-black/80 backdrop-blur-md z-10">
            <button 
              onClick={() => setView('list')}
              className="flex items-center text-sm text-text-muted hover:text-white mb-4 transition-colors"
            >
              <ChevronLeft size={16} className="mr-1" /> Back to Invoices
            </button>
            <div className="flex items-center justify-between">
              <h1 className="text-xl md:text-2xl font-bold">Edit Invoice</h1>
              <div className="flex gap-2">
                <button 
                  onClick={handleSave}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors"
                  title="Save Invoice"
                >
                  <Save size={18} />
                </button>
                <button 
                  onClick={handleDownloadPDF}
                  className="p-2 bg-accent hover:bg-accent-hover rounded-lg text-white transition-colors shadow-glow-sm"
                  title="Download PDF"
                >
                  <Download size={18} />
                </button>
                <button 
                  onClick={handlePrint}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors"
                  title="Print"
                >
                  <Printer size={18} />
                </button>
              </div>
            </div>
            {/* Mobile tab switcher */}
            <div className="flex lg:hidden gap-1 mt-4 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <button 
                onClick={() => setMobileTab('form')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${mobileTab === 'form' ? 'bg-accent text-black' : 'text-text-secondary hover:text-white'}`}
              >
                <Edit2 size={13} /> Edit
              </button>
              <button 
                onClick={() => setMobileTab('preview')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${mobileTab === 'preview' ? 'bg-accent text-black' : 'text-text-secondary hover:text-white'}`}
              >
                <Eye size={13} /> Preview
              </button>
            </div>
          </div>
          
          <div className="p-4 md:p-6">
            <InvoiceForm invoice={calculatedInvoice} setInvoice={setCurrentInvoice} />
          </div>
        </div>

        {/* Live Preview Area */}
        <div className={`flex-1 bg-white/5 overflow-y-auto p-4 md:p-8 custom-scrollbar print:p-0 print:bg-white print:overflow-visible ${mobileTab === 'form' ? 'hidden lg:block' : 'block'}`}>
          {/* Mobile back to form button */}
          <div className="lg:hidden mb-4 print:hidden">
            <button 
              onClick={() => setMobileTab('form')}
              className="flex items-center text-sm text-text-muted hover:text-white transition-colors"
            >
              <ChevronLeft size={16} className="mr-1" /> Back to Editor
            </button>
          </div>
          <div className="max-w-4xl mx-auto print:max-w-none print:m-0">
            <div className="mb-4 flex items-center justify-between print:hidden">
              <h2 className="text-sm font-medium text-text-muted">Live Preview</h2>
            </div>
            {/* The printable template */}
            <div className="overflow-x-auto">
              <InvoiceTemplate invoice={calculatedInvoice} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto h-full flex flex-col print:hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Invoices</h1>
          <p className="text-text-muted text-sm">Generate and manage Menuwo invoices.</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-xl text-white font-medium transition-all shadow-glow-sm"
        >
          <Plus size={18} />
          <span>Create Invoice</span>
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl flex-1 overflow-hidden flex flex-col">
        {(invoices || []).length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 md:p-8">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <FileText size={32} className="text-text-muted" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No invoices yet</h3>
            <p className="text-text-muted max-w-sm mb-6">
              Create your first invoice to bill clients directly from Menuwo.
            </p>
            <button
              onClick={handleCreateNew}
              className="px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-all"
            >
              Get Started
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 text-text-muted text-sm">
                    <th className="px-6 py-4 font-medium">Invoice Number</th>
                    <th className="px-6 py-4 font-medium">Client</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Amount</th>
                    <th className="px-6 py-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(invoices || []).map((inv) => (
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={inv.id} 
                      className="hover:bg-white/5 transition-colors group cursor-pointer"
                      onClick={() => handleEdit(inv)}
                    >
                      <td className="px-6 py-4 font-medium text-white">{inv.invoiceNumber}</td>
                      <td className="px-6 py-4 text-text-muted">{inv.clientName || 'Unnamed Client'}</td>
                      <td className="px-6 py-4 text-text-muted">{inv.date}</td>
                      <td className="px-6 py-4 text-white font-medium">₹{parseFloat(inv.total || 0).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteInvoice(inv.id);
                          }}
                          className="p-2 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-white/5"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-white/5">
              {(invoices || []).map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 space-y-2 active:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => handleEdit(inv)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-white">{inv.invoiceNumber}</p>
                      <p className="text-xs text-text-muted mt-0.5">{inv.clientName || 'Unnamed Client'}</p>
                    </div>
                    <p className="text-white font-bold">₹{parseFloat(inv.total || 0).toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text-muted">{inv.date}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteInvoice(inv.id);
                      }}
                      className="p-2 text-text-muted hover:text-red-400 transition-colors rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
