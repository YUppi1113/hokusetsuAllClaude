import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 text-center">
      <h1 className="text-9xl font-bold text-primary">404</h1>
      <h2 className="mt-6 text-3xl font-bold text-gray-900">ページが見つかりません</h2>
      <p className="mt-2 text-lg text-gray-600 max-w-md mx-auto">
        お探しのページは存在しないか、移動した可能性があります。
      </p>
      <div className="mt-10">
        <Button asChild>
          <Link to="/">ホームに戻る</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;