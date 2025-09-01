import React from 'react';
import { Heart, Activity, LoaderCircle } from 'lucide-react';

interface HealthDashboardProps {
    heartRate: number | null;
    emotion: string;
    diagnosis: string; // Đây sẽ là raw text từ AI
    isLoadingDiagnosis: boolean;
}

// ===================================================================
// Hàm Helper để xử lý Markdown inline (bold: **text**, italic: *text*, và <br>)
// ===================================================================
const renderInlineMarkdown = (text: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    // Bước 1: Chia chuỗi theo thẻ <br> (có thể là <br>, <br/>, <br />)
    const brSegments = text.split(/<br\s*\/?>/i); 

    brSegments.forEach((segment, segmentIndex) => {
        // Nếu không phải đoạn đầu tiên, thêm một thẻ <br />
        if (segmentIndex > 0) {
            nodes.push(<br key={`br-${nodes.length}`} />);
        }

        const currentSubSegment = segment;
        let lastIndex = 0;
        // Regex để tìm lần xuất hiện đầu tiên của **bold** HOẶC *italic*
        const regex = /(\*\*([^*]+?)\*\*|\*([^*]+?)\*)/;

        let match;
        while ((match = currentSubSegment.substring(lastIndex).match(regex))) {
            const fullMatch = match[0]; // Ví dụ: "**bold text**" hoặc "*italic text*"
            const boldContent = match[2]; // Ví dụ: "bold text" (nếu là bold)
            const italicContent = match[3]; // Ví dụ: "italic text" (nếu là italic)
            const matchIndex = lastIndex + currentSubSegment.substring(lastIndex).indexOf(fullMatch);

            // Thêm phần văn bản thuần túy đứng trước (nếu có)
            if (matchIndex > lastIndex) {
                nodes.push(<React.Fragment key={`text-${nodes.length}`}>{currentSubSegment.substring(lastIndex, matchIndex)}</React.Fragment>);
            }

            // Thêm văn bản đã được định dạng
            if (boldContent !== undefined) {
                nodes.push(<strong key={`bold-${nodes.length}`}>{boldContent}</strong>);
            } else if (italicContent !== undefined) {
                nodes.push(<em key={`italic-${nodes.length}`}>{italicContent}</em>);
            }

            lastIndex = matchIndex + fullMatch.length;
        }

        // Thêm bất kỳ văn bản thuần túy còn lại nào ở cuối chuỗi
        if (lastIndex < currentSubSegment.length) {
            nodes.push(<React.Fragment key={`text-${nodes.length}`}>{currentSubSegment.substring(lastIndex)}</React.Fragment>);
        }
    });

    return nodes;
};


// ===================================================================
// Hàm helper để định dạng văn bản chẩn đoán từ AI
// ===================================================================
const formatDiagnosisText = (text: string): React.ReactNode => {
    if (!text) return null;

    const lines = text.split('\n').map(line => line.trim()).filter(line => line !== '');
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let inNumberedList = false;
    let inBulletList = false;
    let currentListItems: React.ReactNode[] = [];

    // Hàm đóng danh sách hiện tại nếu có
    const processList = () => {
        if (inNumberedList && currentListItems.length > 0) {
            elements.push(<ol key={`ol-${elements.length}`} className="list-decimal list-inside pl-4 mb-2">{currentListItems}</ol>);
            currentListItems = [];
        } else if (inBulletList && currentListItems.length > 0) {
            elements.push(<ul key={`ul-${elements.length}`} className="list-disc list-inside pl-4 mb-2">{currentListItems}</ul>);
            currentListItems = [];
        }
        inNumberedList = false;
        inBulletList = false;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const originalI = i; // Lưu index hiện tại để có thể backtrack nếu cần

        // 1. Dòng phân cách ngang (Horizontal Rule)
        if (line === '---') {
            processList();
            elements.push(<hr key={`hr-${elements.length}`} className="my-4 border-gray-300" />);
            continue;
        }

        // 2. Disclaimer (Luôn là phần cuối cùng và có thể có dấu >)
        if (line.startsWith('> Thông tin này') || line.startsWith('**Thông tin này')) { 
            processList();
            // Xóa dấu "> " nếu có, sau đó render Markdown
            const disclaimerText = line.startsWith('>') ? line.substring(1).trim() : line;
            elements.push(<p key="disclaimer" className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-800 font-bold">{renderInlineMarkdown(disclaimerText)}</p>);
            break; // Dừng xử lý sau khi gặp disclaimer
        }
        
        // 3. Tiêu đề Markdown (ví dụ: ### 1. Liên kết giữa các chỉ số)
        const markdownHeadingMatch = line.match(/^###\s*(.*)$/);
        if (markdownHeadingMatch) {
            processList();
            elements.push(<h4 key={`heading-${elements.length}`} className="text-lg font-semibold mt-4 mb-2 text-purple-700">{renderInlineMarkdown(markdownHeadingMatch[1].trim())}</h4>);
            continue;
        }
        // Tiêu đề in đậm (ví dụ: **Phân tích sơ bộ về tình trạng sức khỏe**) - nếu AI vẫn dùng định dạng này cho tiêu đề
        if (line.startsWith('**') && line.endsWith('**') && line.length > 2) {
            processList();
            elements.push(<h4 key={`heading-${elements.length}`} className="text-lg font-semibold mt-4 mb-2 text-purple-700">{renderInlineMarkdown(line.substring(2, line.length - 2))}</h4>);
            continue;
        }

        // 4. Phân tích bảng
        let separator = '';
        let isPotentialTable = false;

        // Phát hiện bảng dựa trên dòng tiêu đề và dấu phân cách
        // Cần đảm bảo phát hiện đúng separator cho dòng header
        if (line.includes('Chỉ số') && line.includes('\t')) { // Bảng phân tách bằng tab
            isPotentialTable = true;
            separator = '\t';
        } else if (line.startsWith('|') && line.includes('|')) { // Bảng phân tách bằng pipe
            isPotentialTable = true;
            separator = '|';
        }

        if (isPotentialTable && !inTable) {
            processList();
            inTable = true;
            
            const tableRows: string[][] = [];
            const headerLine = line; 
            const headerRow = headerLine.split(separator).map(h => h.trim()).filter(h => h !== '');

            i++; // Di chuyển đến dòng tiếp theo (dòng phân cách hoặc dòng dữ liệu đầu tiên)

            // Đối với bảng pipe, bỏ qua dòng phân cách "--------"
            // Đối với bảng tab, không có dòng phân cách, dòng tiếp theo là dữ liệu
            if (separator === '|' && i < lines.length && lines[i].match(/^\|-+\|-+.*\|$/)) {
                i++; // Bỏ qua dòng phân cách của bảng pipe
            } else if (separator === '|' && i < lines.length && !lines[i].startsWith('|')) {
                // Nếu dự kiến là bảng pipe nhưng không có dòng phân cách hoặc dữ liệu hợp lệ,
                // có thể không phải bảng. Quay lại.
                inTable = false;
                i = originalI; // Khôi phục index để xử lý dòng hiện tại như đoạn văn bình thường
                continue; 
            }

            // Thu thập các dòng dữ liệu của bảng
            while (i < lines.length) {
                const currentDataLine = lines[i];
                // Xử lý đặc biệt nếu là bảng pipe để loại bỏ dấu | ở đầu và cuối trước khi split
                const cells = separator === '|' ? 
                    currentDataLine.replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim()) : 
                    currentDataLine.split(separator).map(cell => cell.trim());
                
                const filteredCells = cells.filter(cell => cell !== ''); // Loại bỏ chuỗi rỗng từ split

                // Kiểm tra xem đây có phải là một dòng bảng hợp lệ không
                const isPipeRow = separator === '|' && currentDataLine.startsWith('|') && filteredCells.length >= headerRow.length;
                const isTabRow = separator === '\t' && currentDataLine.includes('\t') && filteredCells.length === headerRow.length;
                
                if (isPipeRow || isTabRow) {
                    tableRows.push(filteredCells);
                    i++;
                } else {
                    break; // Hết bảng
                }
            }
            i--; // Giảm index để không bỏ qua dòng ngay sau bảng

            elements.push(
                <div key={`table-${elements.length}`} className="overflow-x-auto mb-4">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {headerRow.map((header, idx) => (
                                    <th key={idx} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                        {renderInlineMarkdown(header)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {tableRows.map((row, rowIdx) => (
                                <tr key={rowIdx}>
                                    {row.map((cell, cellIdx) => (
                                        <td key={cellIdx} className="px-3 py-2 whitespace-normal text-sm text-gray-900 break-words max-w-[200px]">
                                            {renderInlineMarkdown(cell)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
            inTable = false;
            continue; // Chuyển sang dòng tiếp theo sau khi xử lý bảng
        }

        // 5. Danh sách đánh số 
        const newNumberedListItemMatch = line.match(/^(\d+\.)\s*(.*)$/);
        if (newNumberedListItemMatch) {
            processList(); // Đóng danh sách trước nếu có
            inNumberedList = true;
            const listItemContent = newNumberedListItemMatch[2].trim(); 
            currentListItems.push(
                <li key={`num-li-${elements.length}-${currentListItems.length}`} className="mb-1">
                    {renderInlineMarkdown(listItemContent)}
                </li>
            );
            continue;
        }
        // Các mục con trong danh sách đánh số
        if (inNumberedList && line.match(/^\s*-\s/)) {
             currentListItems.push(
                <li key={`num-sub-li-${elements.length}-${currentListItems.length}`} className="ml-6 text-sm">
                    {renderInlineMarkdown(line.substring(1).trim())}
                </li>
             );
             continue;
        }

        // 6. Danh sách dấu đầu dòng (Bullet List Items) 
        if (line.startsWith('- ')) {
            processList(); 
            inBulletList = true;
            currentListItems.push(
                <li key={`bullet-li-${elements.length}-${currentListItems.length}`} className="mb-1">
                    {renderInlineMarkdown(line.substring(1).trim())}
                </li>
            );
            continue;
        }

        // 7. Đoạn văn bản thông thường
        processList();
        elements.push(<p key={`para-${elements.length}`} className="mb-2 text-gray-700">{renderInlineMarkdown(line)}</p>);
    }

    processList(); 

    return <div className="diagnosis-output">{elements}</div>;
};


const HealthDashboard: React.FC<HealthDashboardProps> = ({ heartRate, emotion, diagnosis, isLoadingDiagnosis }) => {
    return (
        <div className="w-full max-w-5xl p-4 bg-white rounded-lg shadow-md">
            <h3 className="text-xl text-purple-700 font-semibold mb-4">Kết quả phân tích</h3>
             <p className="text-gray-700 mb-4">Hãy nhâm nhi tách trà, để chờ kết quả nhé 🍃.</p>
            <div className="flex justify-around items-center mb-4">
                <div className="flex items-center">
                    <Heart className="text-red-500 mr-2" />
                    <p className="text-lg">Nhịp tim: <strong>{heartRate ?? <LoaderCircle className="animate-spin inline-block" size={16} />}</strong> bpm</p>
                </div>
                <div className="flex items-center">
                    <Activity className="text-green-500 mr-2" />
                    <p className="text-lg">Cảm xúc: <strong>{emotion}</strong></p>
                </div>
            </div>
            <div className="mt-4 border-t pt-4">
                 <h4 className="text-lg font-semibold text-purple-700">Đánh giá Sơ bộ từ AI</h4>
                 {isLoadingDiagnosis ? (
                     <div className="flex items-center text-gray-500">
                         <LoaderCircle className="animate-spin mr-2" />
                         <span>Đang phân tích...</span>
                     </div>
                 ) : (
                    formatDiagnosisText(diagnosis) || <p className="text-gray-700">Nhấn nút 'Thực Hiện Chuẩn Đoán Sức Khỏe' để nhận phân tích.</p>
                 )}
            </div>
        </div>
    );
};

export default HealthDashboard;