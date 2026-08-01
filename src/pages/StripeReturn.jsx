import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { confirmStripeOrder } from '../lib/chargeApi';

export function StripeReturn() {
  const params = new URLSearchParams(window.location.search || '');
  const sessionId = (params.get('session_id') || '').trim();
  const orderNo = (params.get('order_no') || '').trim();
  const [state, setState] = useState(sessionId ? 'processing' : 'failed');
  const [errorMsg, setErrorMsg] = useState(sessionId ? '' : '缺少 Stripe 回跳参数，请重新发起支付。');

  useEffect(() => {
    if (!sessionId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        await confirmStripeOrder({
          session_id: sessionId,
          order_no: orderNo || undefined,
        });
        if (!cancelled) setState('success');
      } catch (err) {
        if (!cancelled) {
          setState('failed');
          setErrorMsg(err?.message || '未能确认本次 Stripe 支付，请重试。');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderNo, sessionId]);

  const goHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="stripe-return-page">
      <div className="stripe-return-card">
        {state === 'processing' && (
          <>
            <Loader2 className="spin" size={48} />
            <h2>正在确认支付</h2>
            <p>请稍候，系统正在核实 Stripe 付款并入账。</p>
          </>
        )}
        {state === 'success' && (
          <>
            <CheckCircle2 size={48} color="#10b981" />
            <h2>支付成功</h2>
            <p>吉米币已到账，可继续创作。</p>
            <button type="button" className="primary" onClick={goHome}>
              返回首页
            </button>
          </>
        )}
        {state === 'failed' && (
          <>
            <XCircle size={48} color="#f43f5e" />
            <h2>支付确认失败</h2>
            <p>{errorMsg}</p>
            <button type="button" className="primary" onClick={goHome}>
              返回首页
            </button>
          </>
        )}
      </div>
      <style>{`
        .stripe-return-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: #0b0b0f;
          color: #f4f4f5;
        }
        .stripe-return-card {
          width: 100%;
          max-width: 420px;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.08);
          background: #18181b;
          padding: 32px;
          text-align: center;
        }
        .stripe-return-card h2 { margin: 16px 0 8px; font-size: 20px; }
        .stripe-return-card p { margin: 0; color: #a1a1aa; font-size: 14px; }
        .stripe-return-card .primary {
          margin-top: 24px;
          border: 0;
          border-radius: 12px;
          background: #635bff;
          color: #fff;
          font-weight: 700;
          padding: 10px 18px;
          cursor: pointer;
        }
        .stripe-return-card .spin { animation: spin 1s linear infinite; color: #f59e0b; margin: 0 auto; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
