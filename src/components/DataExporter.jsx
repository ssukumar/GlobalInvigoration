import React from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { database } from '../firebase/config';

const DataExporter = () => {
  // Simple export function that converts Firebase data to CSV
  const exportToCSV = async (collectionName) => {
    try {
      console.log(`Exporting ${collectionName}...`);
      
      const querySnapshot = await getDocs(collection(database, collectionName));
      const data = [];
      
      querySnapshot.forEach(doc => {
        data.push({
          documentId: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`Found ${data.length} documents in ${collectionName}`);
      
      if (data.length === 0) {
        alert(`No data found in ${collectionName}`);
        return;
      }
      
      // Convert to CSV
      const allKeys = new Set();
      data.forEach(doc => {
        Object.keys(doc).forEach(key => allKeys.add(key));
      });
      
      const headers = Array.from(allKeys);
      const csvRows = [headers.join(',')];
      
      data.forEach(doc => {
        const row = headers.map(header => {
          const value = doc[header];
          if (value === null || value === undefined) return '';
          if (Array.isArray(value)) return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvRows.push(row.join(','));
      });
      
      const csv = csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${collectionName}_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      
      console.log(`✅ Exported ${data.length} documents to CSV`);
      
    } catch (error) {
      console.error(`❌ Error exporting ${collectionName}:`, error);
      alert(`Export failed: ${error.message}`);
    }
  };

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
      margin: '20px',
      maxWidth: '400px'
    }}>
      <h3 style={{ marginTop: 0, color: '#333' }}>Export Firebase Data to CSV</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          onClick={() => exportToCSV('globalInvigorationTrials')}
          style={{
            padding: '12px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          📊 Export Trials Data
        </button>
        
        <button
          onClick={() => exportToCSV('globalInvigorationSubjects')}
          style={{
            padding: '12px 20px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          👥 Export Subjects Data
        </button>
      </div>
      
      <p style={{ 
        fontSize: '12px', 
        color: '#666', 
        marginTop: '15px',
        marginBottom: 0
      }}>
        Downloads CSV files with all data from your Firebase collections
      </p>
    </div>
  );
};

export default DataExporter;
