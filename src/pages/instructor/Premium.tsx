import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Check, Crown, AlertCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

const PremiumPlan = () => {
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkPremiumStatus = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check if instructor has an active premium subscription
        const now = new Date().toISOString();
        const { data: premiumData } = await supabase
          .from('premium_subscriptions')
          .select('*')
          .eq('instructor_id', user.id)
          .eq('status', 'active')
          .lt('start_date', now)
          .gt('end_date', now)
          .maybeSingle();

        setIsPremium(!!premiumData);
        setSubscription(premiumData);
      } catch (error) {
        console.error('Error checking premium status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkPremiumStatus();
  }, []);

  const handleSubscribe = async () => {
    setPaymentLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'エラー',
          description: 'ログインが必要です',
          variant: 'destructive',
        });
        return;
      }

      // In a real application, this would redirect to a payment gateway
      // For this demo, we'll simulate a successful payment

      // Create a new subscription
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

      const { data, error } = await supabase
        .from('premium_subscriptions')
        .insert([
          {
            instructor_id: user.id,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Update lessons to be featured
      await supabase
        .from('lessons')
        .update({ is_featured: true })
        .eq('instructor_id', user.id)
        .eq('status', 'published');

      toast({
        title: 'プレミアムプラン登録完了',
        description: '登録ありがとうございます。特典が有効になりました。',
      });

      setIsPremium(true);
      setSubscription(data);
    } catch (error: any) {
      toast({
        title: '登録エラー',
        description: error.message || '登録処理中にエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCancel = async () => {
    setPaymentLoading(true);
    try {
      if (!subscription) return;

      // Update subscription status
      const { error } = await supabase
        .from('premium_subscriptions')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      if (error) throw error;

      // Set lessons to not featured
      await supabase
        .from('lessons')
        .update({ is_featured: false })
        .eq('instructor_id', subscription.instructor_id);

      toast({
        title: 'プレミアムプラン解約',
        description: 'プレミアムプランの解約が完了しました。期間終了までは特典が継続します。',
      });

      // Refresh page data
      navigate(0);
    } catch (error: any) {
      toast({
        title: '解約エラー',
        description: error.message || '解約処理中にエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-3">プレミアムプラン</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          レッスンの集客力アップと収益の最大化を実現する特別なプラン
        </p>
      </div>

      {isPremium ? (
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-8 border border-yellow-200 mb-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Crown className="w-8 h-8 text-yellow-500 mr-4" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">プレミアムプラン会員</h2>
                <p className="text-gray-600">
                  特典を最大限に活用して、ビジネスを成長させましょう
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">有効期限</p>
              <p className="font-medium">{formatDate(subscription?.end_date)}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-3">現在の特典</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span>検索結果の上位表示</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span>仲介手数料 0円（通常10%）</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span>アカウントに「プレミアム」バッジ表示</span>
                </li>
              </ul>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-3">プラン詳細</h3>
              <p className="mb-3">
                <span className="text-2xl font-bold text-gray-900">{formatCurrency(10000)}</span>
                <span className="text-gray-500"> / 月</span>
              </p>
              <p className="text-gray-600 mb-6">
                毎月自動更新 - いつでもキャンセル可能
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleCancel}
                disabled={paymentLoading}
              >
                {paymentLoading ? '処理中...' : 'プランをキャンセル'}
              </Button>
            </div>
          </div>
          
          <div className="bg-yellow-100 rounded-lg p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-sm text-yellow-700">
              プランをキャンセルしても、現在の請求期間の終了まで特典を引き続き受けられます。
              次回の更新日以降は、特典が自動的に無効になります。
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 mb-10">
          <div className="bg-gradient-to-r from-primary/90 to-primary p-8 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">プレミアムプラン</h2>
                <p className="mt-2 text-white/90">講師のためのプレミアム特典</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">{formatCurrency(10000)}</p>
                <p className="text-sm text-white/90">/ 月（税込）</p>
              </div>
            </div>
          </div>
          
          <div className="p-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">主な特典</h3>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <Check className="h-5 w-5 text-primary mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-gray-900">検索結果の上位表示</h4>
                  <p className="text-gray-600">生徒がレッスンを探す際、あなたのレッスンが検索結果の上部に表示されます。</p>
                </div>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-primary mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-gray-900">仲介手数料 0円</h4>
                  <p className="text-gray-600">通常10%の仲介手数料が完全に無料になります。初回無料レッスンの場合の500円/件も免除されます。</p>
                </div>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-primary mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-gray-900">プレミアムバッジ</h4>
                  <p className="text-gray-600">プロフィールとレッスンに「プレミアム講師」バッジが表示され、信頼性が向上します。</p>
                </div>
              </li>
            </ul>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-8">
              <h3 className="text-base font-medium text-gray-900 mb-2">費用対効果</h3>
              <p className="text-gray-600 mb-2">
                初回無料レッスンを多く提供している講師の場合、月20件以上の予約があれば手数料の方が高くなります。
                プレミアムプランなら、月額10,000円で無制限のレッスンに適用されます。
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>・通常プラン: 500円 × 20件 = 10,000円（初回無料レッスンの場合）</li>
                <li>・通常プラン: レッスン料10,000円 × 10% × 10件 = 10,000円</li>
                <li>・<span className="font-medium text-primary">プレミアムプラン: 月額10,000円で無制限</span></li>
              </ul>
            </div>
            
            <Button 
              className="w-full py-6"
              onClick={handleSubscribe}
              disabled={paymentLoading}
            >
              {paymentLoading ? '処理中...' : 'プレミアムプランに登録する'}
            </Button>
            <p className="text-center text-sm text-gray-500 mt-4">
              いつでもキャンセル可能 - 年間契約の縛りはありません
            </p>
          </div>
        </div>
      )}

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">よくある質問</h2>
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-medium text-gray-900 mb-2">プレミアムプランはいつでもキャンセルできますか？</h3>
              <p className="text-gray-600">
                はい、いつでもキャンセル可能です。キャンセル後も、次の請求日まで特典は継続して利用できます。
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-medium text-gray-900 mb-2">検索結果の上位表示はどのように機能しますか？</h3>
              <p className="text-gray-600">
                プレミアム講師のレッスンは、同じ検索条件の通常レッスンよりも上位に表示されます。
                これにより、生徒があなたのレッスンを見つける可能性が高まります。
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-medium text-gray-900 mb-2">手数料が完全に無料になるのはどのようなレッスンですか？</h3>
              <p className="text-gray-600">
                プレミアムプランに登録すると、対面レッスンの初回無料レッスン手数料（500円/件）と、
                すべてのレッスンの仲介手数料（通常10%）が無料になります。
                オンラインレッスンも対面レッスンも、すべての手数料が免除されます。
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-medium text-gray-900 mb-2">プレミアムプランは収益向上にどのように役立ちますか？</h3>
              <p className="text-gray-600">
                1. 検索結果の上位表示により、より多くの生徒があなたのレッスンを見つけることができます。
                2. 手数料が0円になるため、レッスンごとの収益が10%増加します。
                3. プレミアムバッジにより講師としての信頼性が向上し、予約率の向上が期待できます。
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PremiumPlan;