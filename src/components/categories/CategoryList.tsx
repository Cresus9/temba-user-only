import React from 'react';
import CategoryCard from './CategoryCard';
import { CATEGORIES } from '../../constants/categories';
import { useEvents } from '../../context/EventContext';

export default function CategoryList() {
  const { events } = useEvents();

  const getEventCount = (categoryId: string) => {
    return events.filter(event => event.categories.includes(categoryId)).length;
  };

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
      {CATEGORIES.map((category) => (
        <CategoryCard
          key={category.id}
          {...category}
          eventCount={getEventCount(category.id)}
        />
      ))}
    </div>
  );
}