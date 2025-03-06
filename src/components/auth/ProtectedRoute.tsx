import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface ProtectedRouteProps {
  children: ReactNode;
  user: any;
  userType?: 'user' | 'instructor';
}

const ProtectedRoute = ({ children, user, userType }: ProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [instructorProfile, setInstructorProfile] = useState<any>(null);
  const [activeUserType, setActiveUserType] = useState<'user' | 'instructor' | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchProfiles = async () => {
      try {
        // Check if user has a user profile
        const { data: userData, error: userError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (!userError) {
          setUserProfile(userData);
          setActiveUserType('user');
        }
        
        // Check if user has an instructor profile
        const { data: instructorData, error: instructorError } = await supabase
          .from('instructor_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (!instructorError) {
          setInstructorProfile(instructorData);
          
          // If user has both profiles, the requested userType takes precedence
          if (userType === 'instructor' || (!userError && !userType)) {
            setActiveUserType('instructor');
          }
        }
      } catch (error) {
        console.error('Error fetching profiles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [user, userType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (userType && activeUserType && userType !== activeUserType) {
    return <Navigate to={`/${activeUserType}`} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;