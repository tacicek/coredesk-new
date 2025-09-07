export default function TestPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Sayfası</h1>
      <p>Bu sayfa çalışıyorsa, uygulama temel olarak çalışıyor demektir.</p>
      <button onClick={() => console.log('Button clicked')}>
        Test Button
      </button>
    </div>
  );
}