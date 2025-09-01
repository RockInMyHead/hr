// Утилиты для экспорта данных в различные форматы

interface ExportData {
  headers: string[];
  rows: (string | number)[][];
  title?: string;
  description?: string;
}

// Экспорт в CSV формат
export function exportToCSV(data: ExportData, filename = 'hr-report.csv'): void {
  const csvContent = [
    data.headers.join(','),
    ...data.rows.map(row => row.map(cell => 
      typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
    ).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Экспорт в Excel формат (простая HTML таблица с MIME типом Excel)
export function exportToExcel(data: ExportData, filename = 'hr-report.xls'): void {
  const tableHTML = `
    <html>
      <head>
        <meta charset="utf-8">
        <title>${data.title || 'HR Report'}</title>
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
          .description { font-size: 14px; color: #666; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        ${data.title ? `<div class="title">${data.title}</div>` : ''}
        ${data.description ? `<div class="description">${data.description}</div>` : ''}
        <table>
          <thead>
            <tr>
              ${data.headers.map(header => `<th>${header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.rows.map(row => `
              <tr>
                ${row.map(cell => `<td>${cell}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Экспорт в PDF (упрощенная версия через print)
export function exportToPDF(data: ExportData, filename = 'hr-report.pdf'): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${data.title || 'HR Report'}</title>
        <style>
          @page { margin: 20mm; }
          body { font-family: Arial, sans-serif; font-size: 12px; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
          .description { font-size: 14px; color: #666; margin-bottom: 20px; }
          .generated { font-size: 10px; color: #999; margin-top: 20px; }
        </style>
      </head>
      <body>
        ${data.title ? `<div class="title">${data.title}</div>` : ''}
        ${data.description ? `<div class="description">${data.description}</div>` : ''}
        <table>
          <thead>
            <tr>
              ${data.headers.map(header => `<th>${header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.rows.map(row => `
              <tr>
                ${row.map(cell => `<td>${cell}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="generated">
          Отчет сгенерирован: ${new Date().toLocaleString('ru-RU')}
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(() => window.close(), 100);
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

// Функция для генерации отчета по компетенциям
export function generateCompetencyReport(employees: any[], title = 'Отчет по компетенциям'): ExportData {
  const headers = [
    'Сотрудник',
    'Должность',
    'Email',
    'Коммуникация',
    'Лидерство', 
    'Продуктивность',
    'Надежность',
    'Инициативность',
    'Средний балл',
    'Статус'
  ];

  const rows = employees
    .filter(emp => emp.ratings)
    .map(emp => {
      const ratings = emp.ratings;
      const avgScore = Object.values(ratings).reduce((sum: number, score: any) => sum + score, 0) / Object.values(ratings).length;
      const status = avgScore >= 4 ? 'Высокий уровень' : avgScore >= 3 ? 'Средний уровень' : 'Требует развития';
      
      return [
        emp.name,
        emp.position || 'Не указано',
        emp.email || 'Не указано',
        ratings.communication || 0,
        ratings.leadership || 0,
        ratings.productivity || 0,
        ratings.reliability || 0,
        ratings.initiative || 0,
        avgScore.toFixed(1),
        status
      ];
    });

  return {
    headers,
    rows,
    title,
    description: `Отчет содержит данные по ${employees.length} сотрудникам. Дата формирования: ${new Date().toLocaleDateString('ru-RU')}`
  };
}

// Функция для генерации сводного отчета по отделам
export function generateDepartmentSummary(employees: any[], title = 'Сводка по отделам'): ExportData {
  const departments = Array.from(new Set(employees.map(emp => emp.position || 'Без отдела')));
  
  const headers = [
    'Отдел',
    'Количество сотрудников',
    'Средний балл',
    'Лучший сотрудник',
    'Нуждается в развитии'
  ];

  const rows = departments.map(dept => {
    const deptEmployees = employees.filter(emp => (emp.position || 'Без отдела') === dept);
    const employeesWithRatings = deptEmployees.filter(emp => emp.ratings);
    
    if (employeesWithRatings.length === 0) {
      return [dept, deptEmployees.length, 'Нет данных', 'Нет данных', 'Нет данных'];
    }

    const scores = employeesWithRatings.map(emp => {
      const ratings = emp.ratings;
      return {
        name: emp.name,
        score: Object.values(ratings).reduce((sum: number, score: any) => sum + score, 0) / Object.values(ratings).length
      };
    });

    const avgScore = scores.reduce((sum, emp) => sum + emp.score, 0) / scores.length;
    const bestEmployee = scores.reduce((best, current) => current.score > best.score ? current : best);
    const worstEmployee = scores.reduce((worst, current) => current.score < worst.score ? current : worst);

    return [
      dept,
      deptEmployees.length,
      avgScore.toFixed(1),
      `${bestEmployee.name} (${bestEmployee.score.toFixed(1)})`,
      worstEmployee.score < 3 ? `${worstEmployee.name} (${worstEmployee.score.toFixed(1)})` : 'Все в норме'
    ];
  });

  return {
    headers,
    rows,
    title,
    description: `Сводная статистика по ${departments.length} отделам. Дата формирования: ${new Date().toLocaleDateString('ru-RU')}`
  };
}
